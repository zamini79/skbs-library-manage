// GET /api/cron/sync-holidays — 공휴일 동기화 (수동/보조 트리거)
//
// Vercel Hobby 플랜은 크론 개수·주기 제한이 있어(과거 추가 시 배포 전체가 거부된 이력)
// 이 엔드포인트를 vercel.json 크론으로 등록하지 않는다. 정기 실행은 기존 일일 크론
// /api/cron/update-overdue 가 매월 1일(KST)에 대신 수행한다.
// 이 라우트는 즉시 반영이 필요할 때(임시공휴일 지정 등) 수동 호출용이다.
//
// 수동 트리거: GET /api/cron/sync-holidays with Authorization: Bearer ${CRON_SECRET}
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { adjustFutureDueDates, syncHolidays } from "@/lib/holidays";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  try {
    const sync = await syncHolidays(supabase);
    const adjust = await adjustFutureDueDates(supabase);
    return NextResponse.json({
      ok: true,
      sync,
      adjust,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    console.error("[cron/sync-holidays] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
