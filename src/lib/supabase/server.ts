import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// flowType은 client.ts 와 일치시킴 — implicit (PKCE 미사용). 자세한 이유는 client.ts 주석 참조.
// cookieOptions.maxAge: 자동 로그인의 전제 — Supabase 세션 쿠키가 브라우저 재시작 후에도 유지되도록 6개월 부여.
const SIX_MONTHS_SEC = 60 * 60 * 24 * 180;

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
      cookieOptions: {
        maxAge: SIX_MONTHS_SEC,
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components 에서는 set 불가. 미들웨어/Route Handler에서 처리.
          }
        },
      },
    },
  );
}
