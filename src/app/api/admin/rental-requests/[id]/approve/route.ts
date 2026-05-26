// POST /api/admin/rental-requests/[id]/approve
// 관리자: pending 요청을 승인 → rentals(active) 생성 + request.status=approved 갱신
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { RENTAL_POLICY } from "@/lib/policies";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;
  const adminAuth = adminOrErr;

  const supabase = createAdminClient();

  // 1) 요청 행 잠금 조회
  const { data: request, error: rErr } = await supabase
    .from("rental_requests")
    .select("id, book_id, user_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (rErr || !request) {
    return NextResponse.json(
      { ok: false, error: "REQUEST_NOT_FOUND" },
      { status: 404 },
    );
  }
  if (request.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "ALREADY_PROCESSED", status: request.status },
      { status: 409 },
    );
  }

  // 2) 자격 재검증
  const { data: eligData, error: eligErr } = await supabase.rpc(
    "check_rental_eligibility",
    { p_user_id: request.user_id, p_book_id: request.book_id },
  );
  if (eligErr) {
    return NextResponse.json(
      { ok: false, error: eligErr.message },
      { status: 500 },
    );
  }
  const elig = eligData as { eligible: boolean } & Record<string, unknown>;
  if (!elig?.eligible) {
    return NextResponse.json(
      { ok: false, error: "NOT_ELIGIBLE", eligibility: elig },
      { status: 422 },
    );
  }

  // 3) rentals INSERT (trigger가 books.available_quantity 자동 감소)
  const now = new Date();
  const dueDate = new Date(
    now.getTime() + RENTAL_POLICY.RENTAL_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
  const { data: rental, error: insErr } = await supabase
    .from("rentals")
    .insert({
      user_id: request.user_id,
      book_id: request.book_id,
      admin_id: adminAuth.adminId,
      rented_at: now.toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select("id")
    .single();
  if (insErr || !rental) {
    return NextResponse.json(
      { ok: false, error: insErr?.message ?? "RENTAL_INSERT_FAILED" },
      { status: 500 },
    );
  }

  // 4) 요청 상태 갱신
  const { error: updErr } = await supabase
    .from("rental_requests")
    .update({
      status: "approved",
      processed_at: now.toISOString(),
      processed_by: adminAuth.adminId,
      rental_id: rental.id,
    })
    .eq("id", request.id);
  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    rental_id: rental.id,
    due_date: dueDate.toISOString(),
  });
}
