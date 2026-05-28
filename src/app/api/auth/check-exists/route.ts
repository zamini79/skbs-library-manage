// POST /api/auth/check-exists
// body: { email: string }
// 응답: { exists: boolean, must_change_password?: boolean }
//
// 회원가입 페이지에서 OTP 발송 전, 이미 가입된 이메일인지 확인.
// 추가로 레거시 이관 계정(must_change_password=true)인지 같이 알려준다 — 가입 폼이
// 그 경우 "비밀번호 재설정 메일 발송" 분기로 분류.
// auth.users 는 anon 접근 불가 → service_role 경유.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ exists: false });
  }

  if (typeof email !== "string" || !email.endsWith("@sk.com")) {
    return NextResponse.json({ exists: false });
  }

  const admin = createAdminClient();
  // public.users 조회로 충분 (회원가입 완료된 사용자) — orphan auth.users (인증 미완료) 는 재가입 허용 의도
  const { data, error } = await admin
    .from("users")
    .select("id, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ exists: false });
  return NextResponse.json({
    exists: true,
    must_change_password: !!data.must_change_password,
  });
}
