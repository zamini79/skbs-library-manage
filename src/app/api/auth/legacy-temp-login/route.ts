// POST /api/auth/legacy-temp-login
// body: { email }
//
// 레거시(기존 대출 정보 보유, must_change_password=true) 회원이 신규 가입을 시도할 때,
// 해당 계정의 비밀번호를 공통 임시 비밀번호로 설정한다. 그러면 클라이언트가 그 임시
// 비밀번호로 로그인하고 즉시 /change-password 로 유도한다.
//
// 보안: must_change_password=true 인 계정에만 허용한다. 본인이 이미 비밀번호를 설정한
// 일반 회원(must_change_password=false)에는 동작하지 않는다 — 임의 계정 비밀번호 탈취 방지.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGACY_TEMP_PASSWORD } from "@/lib/policies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.endsWith("@sk.com")) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("users")
    .select("id, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  // 레거시 이관 계정이 아니면 거부 (일반 회원 비밀번호 보호)
  if (!profile || !profile.must_change_password) {
    return NextResponse.json({ ok: false, error: "NOT_ELIGIBLE" }, { status: 403 });
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(profile.id, {
    password: LEGACY_TEMP_PASSWORD,
  });
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
