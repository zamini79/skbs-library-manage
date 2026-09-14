// GET /api/cron/update-overdue — Vercel Cron 일일 호출
//
// 매일 15:00 UTC = 매일 00:00 KST 실행 (vercel.json 참조)
// Authorization: Bearer <CRON_SECRET> 헤더 검증 후
// DB 함수 update_overdue_rentals() 호출 → status='active' AND due_date < NOW() 인 행을 'overdue'로 전환
//
// 매월 1일(KST)에는 공휴일 동기화 + 반납일 영업일 보정도 함께 수행한다.
//   — Vercel Hobby 플랜의 크론 개수/주기 제한(과거 추가 시 배포 전체 거부 이력) 때문에
//     별도 월간 크론을 두지 않고 이 일일 크론에 얹는다.
//   — 1일 실행을 놓쳤거나 공휴일 데이터가 비어 있으면 그날 바로 보충한다(자가 복구).
//
// 수동 트리거: GET /api/cron/update-overdue with Authorization: Bearer ${CRON_SECRET}
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { adjustFutureDueDates, syncHolidays } from "@/lib/holidays";
import { toKstDate } from "@/lib/rental-due";

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
  const { data, error } = await supabase.rpc("update_overdue_rentals");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const updated = typeof data === "number" ? data : Number(data ?? 0);

  // 월 1회 공휴일 동기화 — 실패해도 연체 갱신 결과는 그대로 반환한다.
  const now = new Date();
  const isFirstOfMonth = toKstDate(now).endsWith("-01");
  let holidays: unknown = { skipped: true };
  if (isFirstOfMonth || (await isHolidayDataMissing(supabase, now))) {
    try {
      const sync = await syncHolidays(supabase, 3, now);
      const adjust = await adjustFutureDueDates(supabase, now);
      holidays = { sync, adjust };
    } catch (e) {
      const message = e instanceof Error ? e.message : "UNKNOWN";
      console.error("[cron/update-overdue] holiday sync failed:", message);
      holidays = { error: message };
    }
  }

  return NextResponse.json({
    ok: true,
    updated,
    holidays,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 이번 달 공휴일 데이터가 한 건도 없으면 동기화가 누락된 것으로 본다.
 * (1일 실행을 놓쳤거나 최초 도입 직후에 스스로 보충하기 위한 조건)
 * 조회 자체가 실패하면 false 를 반환해 연체 갱신 흐름을 막지 않는다.
 */
async function isHolidayDataMissing(
  supabase: ReturnType<typeof createAdminClient>,
  now: Date,
): Promise<boolean> {
  const month = toKstDate(now).slice(0, 7);
  const { count, error } = await supabase
    .from("holidays")
    .select("date", { count: "exact", head: true })
    .gte("date", `${month}-01`)
    .lte("date", `${month}-31`);
  if (error) return false;
  return (count ?? 0) === 0;
}
