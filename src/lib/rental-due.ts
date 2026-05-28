// 대출 정책: 대출 당일을 포함하여 RENTAL_PERIOD_DAYS 일간 사용 가능.
// 즉 마지막 사용 가능일 = (대출일의 KST 캘린더 일자) + (RENTAL_PERIOD_DAYS - 1).
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

export function computeDueDate(rentedAt: Date | string): string {
  const rented = typeof rentedAt === "string" ? new Date(rentedAt) : rentedAt;
  const kstDate = KST_DATE_FMT.format(rented); // "YYYY-MM-DD" KST
  // 캘린더 산술은 UTC 기준 Date 로 — TZ shift 영향 없음
  const tmp = new Date(`${kstDate}T00:00:00Z`);
  tmp.setUTCDate(tmp.getUTCDate() + (RENTAL_POLICY.RENTAL_PERIOD_DAYS - 1));
  const lastAllowedKst = tmp.toISOString().slice(0, 10);
  // 마지막 가능일의 KST 23:59:59.999
  return new Date(`${lastAllowedKst}T23:59:59.999+09:00`).toISOString();
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
