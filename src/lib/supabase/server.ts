import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// flowType은 client.ts 와 일치시킴 — implicit (PKCE 미사용). 자세한 이유는 client.ts 주석 참조.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
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
