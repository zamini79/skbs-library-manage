// POST /api/admin/books/[id]/quantity — 기존 도서 수량 늘리기 (master 권한)
// 신규 등록 중 중복 도서가 발견됐을 때, 새로 등록하는 대신 기존 도서의 총·가용 수량을 add 만큼 늘린다.
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { changeBookQuantity, quantityErrorMessage } from "@/lib/book-inventory";

export const runtime = "nodejs";

const BodySchema = z.object({
  add: z.number().int("정수").min(1, "1 이상").max(100, "100 이하"),
});

export async function POST(
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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await changeBookQuantity(createAdminClient(), params.id, {
    add: parsed.data.add,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: quantityErrorMessage(result) },
      { status: result.error === "NOT_FOUND" ? 404 : 409 },
    );
  }
  return NextResponse.json(result);
}
