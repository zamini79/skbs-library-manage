// POST /api/admin/books — 도서 단건 신규 등록 (master 권한)
// 인서트 직후 Google Books API로 표지 자동 조회 후 cover_url_external 채움.
// cover_url(사용자 입력)이 있어도 external은 별도 채움 → 표시는 cover_url 우선.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookCreateSchema } from "@/lib/books-schema";
import { fetchAndStoreCover } from "@/lib/cover-fetch";

export const runtime = "nodejs";

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

  const parsed = BookCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("books")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: 500 },
    );
  }

  // 표지·ISBN·description 자동 조회 (Kakao → Naver → Google) — 공용 헬퍼 사용
  const meta = await fetchAndStoreCover(supabase, data.id, b.title, b.author, b.isbn);

  return NextResponse.json({
    ok: true,
    id: data.id,
    cover_fetched: meta.cover !== null,
    cover_source: meta.coverSource,
  });
}
