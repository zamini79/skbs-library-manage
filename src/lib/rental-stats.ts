// 기간별 대출 통계 — API 라우트와 대시보드 서버 렌더가 같은 로직을 쓰도록 공유한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { kstDateOf, kstEachDay, kstRange, type DayBucket } from "@/lib/kst";

/** 기간별 대출 조회의 최대 기간(일). 양끝 포함이므로 31일 = 최대 한 달. */
export const MAX_RANGE_DAYS = 31;

/**
 * from~to(양끝 포함, KST) 기간의 일별 대출 건수.
 * 최대 31일이라 한 번의 조회로 가져와 Node 에서 KST 날짜별로 집계한다.
 * (rented_at 만 select 하므로 전송량이 작고, 기간 상한 덕분에 행 수도 제한적이다.)
 */
export async function fetchDailyRentalCounts(
  supabase: SupabaseClient<Database>,
  from: string,
  to: string,
): Promise<{ daily: DayBucket[]; total: number }> {
  const { start, end } = kstRange(from, to);

  const { data, error } = await supabase
    .from("rentals")
    .select("rented_at")
    .gte("rented_at", start)
    .lt("rented_at", end);

  if (error) throw error;

  const buckets = kstEachDay(from, to);
  const index = new Map(buckets.map((b) => [b.date, b]));

  for (const row of data ?? []) {
    const bucket = index.get(kstDateOf(row.rented_at));
    if (bucket) bucket.count++;
  }

  return { daily: buckets, total: data?.length ?? 0 };
}
