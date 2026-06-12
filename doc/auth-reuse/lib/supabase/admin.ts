// service_role 클라이언트 — 서버 전용. 절대 client component에서 import 금지.
// RLS를 우회하므로 브라우저 노출 시 보안 사고. 복사 위치: src/lib/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
