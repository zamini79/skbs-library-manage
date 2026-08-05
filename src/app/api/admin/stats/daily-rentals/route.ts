// GET /api/admin/stats/daily-rentals?from=YYYY-MM-DD&to=YYYY-MM-DD
// 지정한 기간(KST 기준, 양끝 포함)에 발생한 대출 건수를 반환한다. 관리자(master/book) 공통 허용.
//
// rented_at 은 timestamptz 이므로 KST 경계 [from 00:00, to+1일 00:00) 로 환산해서 센다.
// count=exact + head 조회라 행 데이터는 전송되지 않는다.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { isValidDateString, kstDayCount, kstRange } from "@/lib/kst";

export const runtime = "nodejs";

// 과도한 범위 조회 방지 (약 5년)
const MAX_RANGE_DAYS = 1830;

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
      { ok: false, error: "RANGE_TOO_LARGE" },
      { status: 400 },
    );
  }

  const { start, end } = kstRange(from, to);
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("rentals")
    .select("id", { count: "exact", head: true })
    .gte("rented_at", start)
    .lt("rented_at", end);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "QUERY_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, from, to, days, count: count ?? 0 });
}
