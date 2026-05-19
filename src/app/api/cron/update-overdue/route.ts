// GET /api/cron/update-overdue — Vercel Cron 일일 호출
//
// 매일 15:00 UTC = 매일 00:00 KST 실행 (vercel.json 참조)
// Authorization: Bearer <CRON_SECRET> 헤더 검증 후
// DB 함수 update_overdue_rentals() 호출 → status='active' AND due_date < NOW() 인 행을 'overdue'로 전환
//
// 수동 트리거: GET /api/cron/update-overdue with Authorization: Bearer ${CRON_SECRET}
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
  const { data, error } = await supabase.rpc("update_overdue_rentals");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const updated = typeof data === "number" ? data : Number(data ?? 0);
  return NextResponse.json({
    ok: true,
    updated,
    timestamp: new Date().toISOString(),
  });
}
