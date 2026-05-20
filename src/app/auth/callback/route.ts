// 매직 링크 클릭 콜백 — Supabase가 세 가지 형태로 token을 보낼 수 있음:
//   1) ?code=...                             → exchangeCodeForSession  (PKCE 표준)
//   2) ?token_hash=pkce_xxx&type=...         → exchangeCodeForSession  (Email Template에 PKCE token을 직접 박은 경우)
//   3) ?token_hash=xxx&type=...              → verifyOtp               (implicit/OTP token hash)
// 실패 시 회원가입 흐름이면 /signup으로, 그 외는 /login으로 돌려보낸다.
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

  // 1) ?code= 직접 전달된 PKCE 흐름
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession(code) failed:", error.message);
  }
  // 2) token_hash가 PKCE 형태(pkce_...)면 동일하게 exchangeCodeForSession 사용
  else if (token_hash?.startsWith("pkce_")) {
    const { error } = await supabase.auth.exchangeCodeForSession(token_hash);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession(token_hash pkce_*) failed:", error.message);
  }
  // 3) token_hash + type가 일반 OTP 형태
  else if (token_hash && isOtpType(type)) {
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
