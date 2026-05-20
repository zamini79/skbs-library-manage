// 매직 링크 클릭 콜백 — Supabase가 두 가지 형태로 보낼 수 있음:
//   1) PKCE flow:        ?code=...                  → exchangeCodeForSession
//   2) Email OTP flow:   ?token_hash=...&type=...   → verifyOtp
// 두 경우 모두 처리하고, 실패 시 회원가입 흐름이면 /signup으로, 그 외는 /login으로 돌려보낸다.
//
// 사용 흐름: 회원가입(Step 1) → 이메일 매직 링크 → 여기로 진입 → /signup/complete (Step 3)
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

export const runtime = "nodejs";

const VALID_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isOtpType(v: string | null): v is EmailOtpType {
  return !!v && VALID_OTP_TYPES.has(v as EmailOtpType);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeRedirect(searchParams.get("next"), "/signup/complete");

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  } else if (token_hash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] verifyOtp failed:", error.message);
  } else {
    console.error(
      "[auth/callback] missing code/token_hash — searchParams:",
      Object.fromEntries(searchParams),
    );
  }

  // 회원가입 흐름에서 실패했으면 /signup으로 돌려보내고, 그 외는 /login으로.
  const fallback = next.startsWith("/signup")
    ? "/signup?error=auth_callback_failed"
    : "/login?error=auth_callback_failed";
  return NextResponse.redirect(`${origin}${fallback}`);
}
