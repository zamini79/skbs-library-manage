// 브라우저용 Supabase 클라이언트. 복사 위치: src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

// flowType: 'implicit'
//   - PKCE는 signUp 시점 브라우저의 code verifier 쿠키가 필요해, 다른 디바이스에서
//     메일을 열면 검증이 깨짐. OTP 코드 방식에선 implicit 가 단순하고 안정적.
// cookieOptions.maxAge: 세션 쿠키에 만료를 부여해 브라우저 재시작 후에도 로그인 유지.
const SIX_MONTHS_SEC = 60 * 60 * 24 * 180;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
      cookieOptions: { maxAge: SIX_MONTHS_SEC, sameSite: "lax", path: "/" },
    },
  );
}
