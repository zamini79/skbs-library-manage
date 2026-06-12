// 서버 컴포넌트/Route Handler용 Supabase 클라이언트. 복사 위치: src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SIX_MONTHS_SEC = 60 * 60 * 24 * 180;

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
      cookieOptions: { maxAge: SIX_MONTHS_SEC, sameSite: "lax", path: "/" },
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
            // Server Component 에서는 set 불가 — 미들웨어/Route Handler 에서 처리됨
          }
        },
      },
    },
  );
}
