// POST /api/admin/logout — admin_session 쿠키 삭제
import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
