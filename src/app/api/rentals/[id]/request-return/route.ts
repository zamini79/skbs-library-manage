// POST   /api/rentals/[id]/request-return — 본인 active/overdue 대출를 "반납 대기"로 요청
// DELETE /api/rentals/[id]/request-return — 본인 반납 요청(아직 미확정) 취소
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    )
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rental, error: selErr } = await admin
    .from("rentals")
    .select("id, user_id, status, return_requested_at")
    .eq("id", params.id)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  if (!rental || rental.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (!["active", "overdue"].includes(rental.status)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_STATE", status: rental.status },
      { status: 409 },
    );
  }
  if (rental.return_requested_at) {
    return NextResponse.json(
      { ok: false, error: "ALREADY_REQUESTED" },
      { status: 409 },
    );
  }

  const { error: updErr } = await admin
    .from("rentals")
    .update({ return_requested_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    )
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rental, error: selErr } = await admin
    .from("rentals")
    .select("id, user_id, status, return_requested_at")
    .eq("id", params.id)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  if (!rental || rental.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 },
    );
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

  const { error: updErr } = await admin
    .from("rentals")
    .update({ return_requested_at: null })
    .eq("id", params.id);
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
