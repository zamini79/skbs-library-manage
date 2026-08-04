// GET /api/admin/stats/daily-rentals?date=YYYY-MM-DD
// 지정한 날짜(KST 기준)에 발생한 대출 건수를 반환한다. 관리자(master/book) 공통 허용.
//
// rented_at 은 timestamptz 이므로 KST 하루 경계 [00:00, 익일 00:00) 로 환산해서 센다.
// count=exact + head 조회라 행 데이터는 전송되지 않는다.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { isValidDateString, kstDayRange } from "@/lib/kst";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!isValidDateString(date)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_DATE" },
      { status: 400 },
    );
  }

  const { start, end } = kstDayRange(date);
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

  return NextResponse.json({ ok: true, date, count: count ?? 0 });
}
