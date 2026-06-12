// POST /api/auth/check-exists  body:{ email }  →  { exists: boolean }
// OTP 발송 전 이미 가입된 이메일인지 확인. auth.users 는 anon 접근 불가 → service_role 경유.
// 복사 위치: src/app/api/auth/check-exists/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTH_CONFIG, isAllowedEmail } from "@/lib/auth-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email: unknown;
  try {
    email = (await request.json())?.email;
  } catch {
    return NextResponse.json({ exists: false });
  }
  if (typeof email !== "string" || !isAllowedEmail(email)) {
    return NextResponse.json({ exists: false });
  }

  const admin = createAdminClient();
  // 가입 완료된 프로필 기준 (인증만 하고 미완료된 orphan auth.users 는 재가입 허용)
  const { data, error } = await admin
    .from(AUTH_CONFIG.profileTable)
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true });
}
