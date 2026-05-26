import { createBrowserClient } from "@supabase/ssr";

// flowType: 'implicit' 사용 이유:
//   - PKCE flow는 signUp 시점의 브라우저에 저장된 code verifier cookie가 필요.
//     사용자가 다른 브라우저/디바이스에서 confirm 메일을 클릭하면 cookie 매칭이
//     안 돼 검증 실패. 사내 환경에서 이 제약이 잦아 운영 어려움.
//   - Implicit flow는 cookie 의존이 없어 다른 디바이스에서 confirm해도 동작.
//   - 보안 trade-off는 있으나 사내 도서관 MVP 규모에서는 실용적.
//
// cookieOptions.maxAge:
//   - Supabase 인증 쿠키(sb-*-auth-token)에 명시적인 maxAge 를 부여해서
//     브라우저 재시작 후에도 세션이 살아 있도록 한다 (자동 로그인의 전제).
//   - "자동 로그인 해제" UX 는 별도 마커 쿠키(member_remember)가 담당:
//     로그인 시 미체크면 마커가 세션 쿠키로 발급되고, 브라우저 종료 시 마커가 사라지면
//     (member) 레이아웃이 /api/auth/expire 로 강제 로그아웃 시킨다.
const SIX_MONTHS_SEC = 60 * 60 * 24 * 180;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
      cookieOptions: {
        maxAge: SIX_MONTHS_SEC,
        sameSite: "lax",
        path: "/",
      },
    },
  );
}
