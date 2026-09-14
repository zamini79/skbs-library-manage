// 대출 정책: 대출 당일을 포함하여 RENTAL_PERIOD_DAYS 일간 사용 가능.
// 즉 마지막 사용 가능일 = (대출일의 KST 캘린더 일자) + (RENTAL_PERIOD_DAYS - 1).
//
// 단, 그렇게 나온 날이 주말(토·일)이거나 공휴일이면 "이후 가장 먼저 도래하는 평일"로
// 이월한다(반납 창구가 닫혀 있는 날을 기한으로 줄 수 없으므로). 결과적으로 실질
// 대여기간은 14일보다 길어질 수 있다.
//
// due_date 는 그 마지막 날의 KST 23:59:59.999 로 저장한다 — 그래야:
//   - 트리거 `returned_at > due_date` 가 "당일 반납 = 정시" 를 자연스럽게 분류
//   - cron `update_overdue_rentals` 가 다음 자정 KST 부터 overdue 로 자동 전환
//   - 화면에 표시되는 캘린더 날짜가 곧 사용자가 인식하는 "반납기한 날짜"
//   - cooldown 및 알림 cron 의 KST day-diff 계산이 보정 없이 일치
import { RENTAL_POLICY } from "@/lib/policies";

const KST_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 이월 탐색 상한 — 공휴일 데이터가 잘못돼도 무한 루프에 빠지지 않도록 한다. */
const MAX_SHIFT_DAYS = 30;

/** "YYYY-MM-DD" 에서 delta 일 이동 (KST 캘린더 기준, TZ shift 영향 없음). */
function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** 토·일 여부 (KST 캘린더 날짜 문자열 기준). */
export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=일, 6=토
  return day === 0 || day === 6;
}

/** 평일이면서 공휴일이 아닌 날 = 영업일. */
export function isBusinessDay(
  date: string,
  holidays: ReadonlySet<string>,
): boolean {
  return !isWeekend(date) && !holidays.has(date);
}

/**
 * date 가 영업일이면 그대로, 아니면 이후 가장 먼저 도래하는 영업일을 반환한다.
 * 연휴가 이어져도 계속 밀며, MAX_SHIFT_DAYS 를 넘기면 더 밀지 않고 마지막 값을 반환한다
 * (공휴일 데이터 오류로 반납일이 무한정 밀리는 것을 막기 위한 안전장치).
 */
export function nextBusinessDay(
  date: string,
  holidays: ReadonlySet<string>,
): string {
  let cur = date;
  for (let i = 0; i < MAX_SHIFT_DAYS; i++) {
    if (isBusinessDay(cur, holidays)) return cur;
    cur = shiftDate(cur, 1);
  }
  return cur;
}

/** KST 캘린더 날짜("YYYY-MM-DD")를 그날 23:59:59.999 KST 의 ISO 문자열로. */
export function toKstEndOfDay(date: string): string {
  return new Date(`${date}T23:59:59.999+09:00`).toISOString();
}

/** timestamptz 를 KST 캘린더 날짜("YYYY-MM-DD")로. */
export function toKstDate(ts: Date | string): string {
  return KST_DATE_FMT.format(typeof ts === "string" ? new Date(ts) : ts);
}

/**
 * 반납기한 계산. holidays 는 "YYYY-MM-DD" 집합이며, 주말/공휴일이면 다음 영업일로 이월한다.
 * 공휴일 집합을 빠뜨리는 실수를 막기 위해 인자를 필수로 둔다(주말만 반영하려면 빈 Set 전달).
 */
export function computeDueDate(
  rentedAt: Date | string,
  holidays: ReadonlySet<string>,
): string {
  const kstDate = toKstDate(rentedAt); // "YYYY-MM-DD" KST
  const lastAllowedKst = shiftDate(
    kstDate,
    RENTAL_POLICY.RENTAL_PERIOD_DAYS - 1,
  );
  return toKstEndOfDay(nextBusinessDay(lastAllowedKst, holidays));
}

// KST 캘린더 일수 차이로 연체 일수 계산 (음수면 0 반환).
// due_date 가 KST EOD 로 저장된다는 전제하에, KST 일자 단위로 비교.
export function daysOverdueKst(
  dueIso: string,
  asOf: Date = new Date(),
): number {
  const dueKst = KST_DATE_FMT.format(new Date(dueIso));
  const todayKst = KST_DATE_FMT.format(asOf);
  const dueMs = Date.parse(`${dueKst}T00:00:00Z`);
  const todayMs = Date.parse(`${todayKst}T00:00:00Z`);
  return Math.max(0, Math.round((todayMs - dueMs) / 86_400_000));
}
