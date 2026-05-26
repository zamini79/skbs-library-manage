// DELETE /api/rental-requests/[id]
// 사용자가 본인의 pending 신청을 취소
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("rental_requests")
    .select("id, user_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "NOT_CANCELABLE" },
      { status: 409 },
    );
  }

  const { error: delErr } = await admin
    .from("rental_requests")
    .delete()
    .eq("id", params.id);
  if (delErr) {
    return NextResponse.json(
      { ok: false, error: delErr.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
