// POST /api/admin/books — 도서 단건 신규 등록 (master 권한)
// 인서트 직후 Google Books API로 표지 자동 조회 후 cover_url_external 채움.
// cover_url(사용자 입력)이 있어도 external은 별도 채움 → 표시는 cover_url 우선.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookCreateSchema } from "@/lib/books-schema";
import { fetchGoogleBookMetadata } from "@/lib/google-books";
import { fetchKakaoBookMetadata } from "@/lib/kakao-books";
import { fetchNaverBookMetadata } from "@/lib/naver-books";

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

  // 표지·ISBN·description 자동 조회 — Kakao → Naver → Google 순차로 빈 칸 채움.
  // - 표지: 첫 매칭 사용
  // - ISBN: 첫 매칭이 없으면 다음 소스 시도
  // - description: kakao 우선, 없으면 naver, 그래도 없으면 google
  let cover: string | null = null;
  let isbn: string | null = b.isbn;
  let description: string | null = null;
  let coverSource: "kakao" | "naver" | "google" | null = null;

  const k = await fetchKakaoBookMetadata({ title: b.title, author: b.author });
  if (k.cover) { cover = k.cover; coverSource = "kakao"; }
  if (k.isbn && !isbn) isbn = k.isbn;
  if (k.description) description = k.description;

  if (!cover || !isbn || !description) {
    const n = await fetchNaverBookMetadata({ title: b.title, author: b.author });
    if (!cover && n.cover) { cover = n.cover; coverSource = "naver"; }
    if (!isbn && n.isbn) isbn = n.isbn;
    if (!description && n.description) description = n.description;
  }
  if (!cover || !isbn) {
    const g = await fetchGoogleBookMetadata({ title: b.title, author: b.author });
    if (!cover && g.cover) { cover = g.cover; coverSource = "google"; }
    if (!isbn && g.isbn) isbn = g.isbn;
  }

  const updates: {
    cover_url_external?: string;
    isbn?: string;
    description?: string;
  } = {};
  if (cover) updates.cover_url_external = cover;
  if (isbn && isbn !== b.isbn) updates.isbn = isbn;
  if (description) updates.description = description;

  if (Object.keys(updates).length > 0) {
    await supabase.from("books").update(updates).eq("id", data.id);
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    cover_fetched: cover !== null,
    cover_source: coverSource,
  });
}
