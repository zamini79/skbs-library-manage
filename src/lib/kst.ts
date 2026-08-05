// KST(Asia/Seoul) 캘린더 유틸.
//
// rentals.rented_at 은 timestamptz 이므로 "며칠/몇월에 빌렸나" 를 세려면 반드시 KST 로
// 환산해야 한다. 예: 2026-07-31T15:30:00Z 는 KST 로 2026-08-01 이다.
// 서버 시간대에 의존하지 않도록 모든 변환은 Intl(timeZone: Asia/Seoul) 로 처리한다.

const KST_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 현재 시각의 KST 캘린더 날짜 ("YYYY-MM-DD"). */
export function kstToday(): string {
  return KST_DATE_FMT.format(new Date());
}

/** "YYYY-MM-DD" 형식이면서 실재하는 날짜인지 검증. */
export function isValidDateString(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * KST 하루의 시각 범위를 ISO 문자열로 반환한다.
 * 경계는 [start, end) — end 는 다음 날 00:00 KST 이므로 조회 시 lt(end) 로 쓴다.
 */
export function kstDayRange(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00.000+09:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** KST 캘린더 기준으로 date("YYYY-MM-DD")에서 delta일 이동한 날짜. */
export function kstShiftDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** KST 기간 [from 00:00, to+1일 00:00) 의 시각 범위. from·to 는 양끝 포함. */
export function kstRange(from: string, to: string): { start: string; end: string } {
  return { start: kstDayRange(from).start, end: kstDayRange(to).end };
}

/** 양끝을 포함한 기간의 일수 (from > to 면 0). */
export function kstDayCount(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export type MonthBucket = {
  /** "YYYY-MM" */
  key: string;
  /** 차트 X축 라벨 — 연이 바뀌는 1월만 "YY년 M월" 로 구분 */
  label: string;
  start: string;
  end: string;
};

/**
 * 현재 월을 포함한 최근 n개월 구간을 오래된 순으로 반환한다.
 * 월 경계는 KST 기준(매월 1일 00:00 KST).
 */
export function kstRecentMonths(n: number): MonthBucket[] {
  const today = kstToday();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)); // 1-based

  const out: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    // Date.UTC 로 월 인덱스 산술 — 음수 월도 연도까지 알아서 넘어간다.
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;

    const start = new Date(`${key}-01T00:00:00.000+09:00`);
    const endDate = new Date(Date.UTC(y, m, 1));
    const endKey = `${endDate.getUTCFullYear()}-${String(
      endDate.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
    const end = new Date(`${endKey}-01T00:00:00.000+09:00`);

    out.push({
      key,
      label: m === 1 ? `${String(y).slice(2)}년 1월` : `${m}월`,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }
  return out;
}
