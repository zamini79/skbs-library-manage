// POST /api/admin/books/bulk — 도서 일괄 등록 (master 권한)
// Body: { rows: BookCreate[] }
// INSERT 후 각 도서마다 외부 표지·메타 자동 조회(Kakao→Naver→Google) — 동시성 제한 5.
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookCreateSchema } from "@/lib/books-schema";
import { fetchAndStoreCover } from "@/lib/cover-fetch";

export const runtime = "nodejs";
export const maxDuration = 60; // 벌크 + 표지 자동조회 시간 고려

const BATCH_SIZE = 200;
const MAX_ROWS = 5000;
const COVER_CONCURRENCY = 5;

const Body = z.object({
  rows: z.array(BookCreateSchema).min(1).max(MAX_ROWS),
});

export async function POST(req: Request) {
  const adminOrErr = await getMasterOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;
  const admin = adminOrErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data.rows.map((b) => ({
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    isbn: b.isbn,
    category: b.category,
    price: b.price,
    total_quantity: b.total_quantity,
    available_quantity: b.total_quantity,
    cover_url: b.cover_url,
    created_by: admin.adminId,
  }));

  const supabase = createAdminClient();

  let inserted = 0;
  const failures: Array<{ start: number; end: number; message: string }> = [];
  // INSERT 한 책의 id/title/author/isbn 모음 — 표지 조회용
  const insertedBooks: Array<{
    id: string;
    title: string;
    author: string;
    isbn: string | null;
  }> = [];

  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const slice = payload.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("books")
      .insert(slice)
      .select("id, title, author, isbn");
    if (error) {
      failures.push({ start: i, end: i + slice.length, message: error.message });
    } else if (data) {
      inserted += data.length;
      for (const row of data) insertedBooks.push(row as (typeof insertedBooks)[number]);
    }
  }

  // 표지 자동 조회 — 동시성 제한해 외부 API 부하 + 함수 timeout 고려
  let coverFetched = 0;
  for (let i = 0; i < insertedBooks.length; i += COVER_CONCURRENCY) {
    const slice = insertedBooks.slice(i, i + COVER_CONCURRENCY);
    const results = await Promise.allSettled(
      slice.map((b) =>
        fetchAndStoreCover(supabase, b.id, b.title, b.author, b.isbn),
      ),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.cover) coverFetched++;
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    inserted,
    cover_fetched: coverFetched,
    failures,
  });
}
