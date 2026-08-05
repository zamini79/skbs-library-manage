// GET /api/admin/stats/daily-rentals?from=YYYY-MM-DD&to=YYYY-MM-DD
// 지정한 기간(KST 기준, 양끝 포함)의 일별 대출 건수와 합계를 반환한다.
// 관리자(master/book) 공통 허용. 기간은 최대 한 달(31일).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { isValidDateString, kstDayCount } from "@/lib/kst";
import { fetchDailyRentalCounts, MAX_RANGE_DAYS } from "@/lib/rental-stats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const params = new URL(req.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  if (!isValidDateString(from) || !isValidDateString(to)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_DATE" },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { ok: false, error: "INVALID_RANGE" },
      { status: 400 },
    );
  }
  const days = kstDayCount(from, to);
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { ok: false, error: "RANGE_TOO_LARGE", maxDays: MAX_RANGE_DAYS },
      { status: 400 },
    );
  }

  try {
    const { daily, total } = await fetchDailyRentalCounts(
      createAdminClient(),
      from,
      to,
    );
    return NextResponse.json({ ok: true, from, to, days, count: total, daily });
  } catch {
    return NextResponse.json(
      { ok: false, error: "QUERY_FAILED" },
      { status: 500 },
    );
  }
}
