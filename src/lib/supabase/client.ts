import { createBrowserClient } from "@supabase/ssr";

// flowType: 'implicit' 사용 이유:
//   - PKCE flow는 signUp 시점의 브라우저에 저장된 code verifier cookie가 필요.
//     사용자가 다른 브라우저/디바이스에서 confirm 메일을 클릭하면 cookie 매칭이
//     안 돼 검증 실패. 사내 환경에서 이 제약이 잦아 운영 어려움.
//   - Implicit flow는 cookie 의존이 없어 다른 디바이스에서 confirm해도 동작.
//   - 보안 trade-off는 있으나 사내 도서관 MVP 규모에서는 실용적.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
    },
  );
}
