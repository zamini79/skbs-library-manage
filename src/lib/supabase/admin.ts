// 이 파일은 서버 사이드에서만 사용. 절대 client component에서 import 금지.
// service_role 키는 RLS 우회 권한을 가지므로 브라우저에 노출되면 보안 사고로 직결.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
