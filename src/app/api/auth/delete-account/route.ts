// POST /api/auth/delete-account
// 본인 계정을 영구 삭제. 인증된 사용자만 호출 가능.
// auth.users 삭제 → public.users CASCADE 로 함께 정리.
// 자발적 탈퇴이므로 consent_deletions tombstone 은 기록하지 않음 (재가입 시 안내 없음).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json(
      { ok: false, error: delErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
