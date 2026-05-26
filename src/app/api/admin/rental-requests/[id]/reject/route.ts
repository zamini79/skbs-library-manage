// POST /api/admin/rental-requests/[id]/reject
// 관리자: pending 요청을 반려 → request.status=rejected (선택: reject_reason)
// Body: { reason?: string }
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";

const Body = z.object({ reason: z.string().max(500).optional() });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;
  const adminAuth = adminOrErr;

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // body 없어도 됨
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: request, error: rErr } = await supabase
    .from("rental_requests")
    .select("id, status")
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

  const { error: updErr } = await supabase
    .from("rental_requests")
    .update({
      status: "rejected",
      processed_at: new Date().toISOString(),
      processed_by: adminAuth.adminId,
      reject_reason: parsed.data.reason ?? null,
    })
    .eq("id", request.id);
  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
