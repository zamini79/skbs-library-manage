// POST /api/admin/rentals/[id]/reject-return — 반납 요청 반려
//
// 회원이 올린 반납 요청(return_requested_at)을 관리자가 반려한다.
// 처리: rentals.return_requested_at = null → 대출은 기존 상태(active/overdue) 유지.
// 재고/마일리지 변동 없음 (반납 확정이 아니므로 트리거 미발동).
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

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    )
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: rental, error: selErr } = await supabase
    .from("rentals")
    .select("id, status, return_requested_at")
    .eq("id", params.id)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  if (!rental) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  if (!["active", "overdue"].includes(rental.status)) {
    return NextResponse.json(
      { ok: false, error: "ALREADY_PROCESSED", status: rental.status },
      { status: 409 },
    );
  }
  if (!rental.return_requested_at) {
    return NextResponse.json(
      { ok: false, error: "NOT_REQUESTED" },
      { status: 409 },
    );
  }

  const { error: updErr } = await supabase
    .from("rentals")
    .update({ return_requested_at: null })
    .eq("id", params.id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
