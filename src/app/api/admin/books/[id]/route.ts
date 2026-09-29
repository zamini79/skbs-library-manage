// PATCH /api/admin/books/[id] — 도서 메타데이터·총 수량 수정 (master 권한)
// 총 수량이 바뀌면 가용 수량을 같은 차이만큼 맞춘다. 대출 중인 권수 미만으로는 줄일 수 없다.
// 상태(status) 는 변경하지 않는다 (폐기는 /dispose).
// 표지 외부 자동조회도 재실행하지 않음 — cover_url 입력값을 그대로 저장(표시 우선순위 유지).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookUpdateSchema } from "@/lib/books-schema";
import { changeBookQuantity, quantityErrorMessage } from "@/lib/book-inventory";

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

  // 수량부터 반영 — 대출 중 권수 미만 등으로 거부되면 메타데이터도 저장하지 않는다.
  const qty = await changeBookQuantity(supabase, params.id, { total: b.total_quantity });
  if (!qty.ok) {
    return NextResponse.json(
      { ok: false, error: qty.error, message: quantityErrorMessage(qty) },
      { status: qty.error === "NOT_FOUND" ? 404 : 409 },
    );
  }

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
