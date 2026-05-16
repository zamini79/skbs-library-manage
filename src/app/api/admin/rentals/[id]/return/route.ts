// POST /api/admin/rentals/[id]/return — 반납 처리
//
// 처리: rentals UPDATE { status='returned', returned_at=NOW(), return_admin_id }
// DB trigger `process_book_return`이 자동으로:
//   - books.available_quantity 복구
//   - 연체 여부 판단 (returned_at > due_date)
//   - mileage_history INSERT (+10 정상 / -5 연체)
//   - users.mileage UPDATE
// → 코드에서 마일리지 계산 절대 금지
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;
  const admin = adminOrErr;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    )
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 사전 조회 — 이미 반납된 건이면 거부
  const { data: rental, error: selErr } = await supabase
    .from("rentals")
    .select("id, status, due_date")
    .eq("id", params.id)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  if (!rental) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (rental.status === "returned") {
    return NextResponse.json(
      { ok: false, error: "ALREADY_RETURNED" },
      { status: 409 },
    );
  }

  const returnedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("rentals")
    .update({
      status: "returned",
      returned_at: returnedAt,
      return_admin_id: admin.adminId,
    })
    .eq("id", params.id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  const wasOverdue = new Date(returnedAt) > new Date(rental.due_date);
  return NextResponse.json({
    ok: true,
    returned_at: returnedAt,
    was_overdue: wasOverdue,
    mileage_delta: wasOverdue ? -5 : 10,
  });
}
