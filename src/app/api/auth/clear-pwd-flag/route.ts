// POST /api/auth/clear-pwd-flag
// 인증된 사용자의 must_change_password 플래그를 FALSE 로 클리어.
//
// 멤버는 RLS 컬럼 제약(consent_given_at 만 UPDATE 가능)으로 직접 컬럼을 못 바꿈 →
// 서버에서 세션 확인 후 service_role 로 본인 행만 갱신.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
