// POST /api/auth/check-exists
// body: { email: string }
// 응답: { exists: boolean }
//
// 회원가입 페이지에서 OTP 발송 전, 이미 가입된 이메일인지 확인.
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
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: !!data });
}
