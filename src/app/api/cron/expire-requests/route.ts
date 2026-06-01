// GET /api/cron/expire-requests — Vercel Cron (5분마다)
//
// 15분 경과한 pending 대출 신청을 자동 반려한다 (DB 함수 expire_stale_rental_requests).
// Authorization: Bearer <CRON_SECRET> 헤더 필수.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET_NOT_CONFIGURED" },
      { status: 500 },
    );
  }
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("expire_stale_rental_requests");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const expired = typeof data === "number" ? data : Number(data ?? 0);
  return NextResponse.json({
    ok: true,
    expired,
    timestamp: new Date().toISOString(),
  });
}
