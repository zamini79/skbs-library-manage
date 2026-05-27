// PATCH /api/admin/books/[id] — 도서 메타데이터 수정 (master 권한)
// 수량(total_quantity)·가용수량(available_quantity)·상태(status)는 변경하지 않는다.
// 표지 외부 자동조회도 재실행하지 않음 — cover_url 입력값을 그대로 저장(표시 우선순위 유지).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookUpdateSchema } from "@/lib/books-schema";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const adminOrErr = await getMasterOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = BookUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("books")
    .update({
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      isbn: b.isbn,
      category: b.category,
      price: b.price,
      cover_url: b.cover_url,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
