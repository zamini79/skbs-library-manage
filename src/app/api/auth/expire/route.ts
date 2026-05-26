// GET /api/auth/expire
// 자동 로그인 만료(session-only 이거나 6개월 경과) 시, 세션을 끊고 /login 으로 보냄.
// Route Handler 이므로 쿠키를 정상적으로 set/clear 할 수 있음.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = createClient();
  await supabase.auth.signOut().catch(() => {});
  const url = new URL("/login?reason=auto_login_expired", req.url);
  return NextResponse.redirect(url);
}
