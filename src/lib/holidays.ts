// 공휴일 동기화 및 조회.
//
// 출처: 공공데이터포털 — 한국천문연구원 특일 정보(getRestDeInfo).
// 임시공휴일·대체공휴일이 지정되면 이 API에 반영되므로 월 1회 동기화한다.
// 필요 env: HOLIDAY_API_KEY (data.go.kr 일반 인증키, "디코딩" 값)
//
// holidays 테이블의 source 구분:
//   'api'    — 이 동기화가 관리(덮어씀)
//   'manual' — 회사 자체 휴무일. 동기화가 건드리지 않는다.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeDueDate,
  nextBusinessDay,
  toKstDate,
  toKstEndOfDay,
} from "@/lib/rental-due";

const API_URL =
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

// holidays 테이블은 아직 database.types.ts(자동 생성)에 없어 제네릭을 느슨하게 둔다.
// 마이그레이션 적용 후 타입을 재생성하면 SupabaseClient<Database> 로 좁힐 수 있다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, "public", any>;

export type HolidayRow = { date: string; name: string };

/** locdate(20260101 형태)를 "YYYY-MM-DD" 로. */
function toDateString(locdate: number | string): string | null {
  const s = String(locdate);
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** 한 달치 공휴일 조회. 네트워크/파싱 실패는 예외로 던진다. */
export async function fetchHolidaysForMonth(
  year: number,
  month: number,
): Promise<HolidayRow[]> {
  const key = process.env.HOLIDAY_API_KEY;
  if (!key) throw new Error("HOLIDAY_API_KEY_NOT_CONFIGURED");

  const params = new URLSearchParams({
    serviceKey: key,
    solYear: String(year),
    solMonth: String(month).padStart(2, "0"),
    numOfRows: "100",
    _type: "json",
  });

  const res = await fetch(`${API_URL}?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HOLIDAY_API_HTTP_${res.status}`);

  const text = await res.text();
  // 인증키 오류 등은 JSON이 아닌 XML 에러 문서로 돌아온다 — 메시지를 살려서 던진다.
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HOLIDAY_API_NOT_JSON: ${text.slice(0, 160)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (json as any)?.response?.body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const header = (json as any)?.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`HOLIDAY_API_${header.resultCode}: ${header.resultMsg}`);
  }

  // totalCount=0 이면 items 가 빈 문자열로 오는 경우가 있다.
  const rawItems = body?.items?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const out: HolidayRow[] = [];
  for (const it of items) {
    if (it?.isHoliday !== "Y") continue; // 공휴일이 아닌 기념일은 제외
    const date = toDateString(it.locdate);
    if (date) out.push({ date, name: String(it.dateName ?? "공휴일") });
  }
  return out;
}

/** 대상 월 목록 — 현재 월부터 monthsAhead 개월. */
function targetMonths(
  from: Date,
  monthsAhead: number,
): Array<{ year: number; month: number }> {
  const kst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
  const y = Number(kst.slice(0, 4));
  const m = Number(kst.slice(5, 7));
  const out: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }
  return out;
}

export type SyncResult = {
  months: string[];
  fetched: number;
  upserted: number;
  skippedManual: number;
};

/**
 * 현재 월부터 monthsAhead 개월치 공휴일을 동기화한다.
 * 대여기간이 14일이라 2~3개월치면 충분하다. manual 행은 보존한다.
 */
export async function syncHolidays(
  supabase: Client,
  monthsAhead = 3,
  now: Date = new Date(),
): Promise<SyncResult> {
  const months = targetMonths(now, monthsAhead);
  const fetched: HolidayRow[] = [];
  for (const { year, month } of months) {
    fetched.push(...(await fetchHolidaysForMonth(year, month)));
  }

  // 같은 날짜가 중복으로 올 수 있어 날짜 기준으로 정리
  const byDate = new Map(fetched.map((h) => [h.date, h]));

  // 자체 휴무일(manual)은 덮어쓰지 않는다.
  const dates = Array.from(byDate.keys());
  let skippedManual = 0;
  if (dates.length > 0) {
    const { data: manual, error } = await supabase
      .from("holidays")
      .select("date")
      .eq("source", "manual")
      .in("date", dates);
    if (error) throw error;
    for (const row of manual ?? []) {
      byDate.delete((row as { date: string }).date);
      skippedManual++;
    }
  }

  const rows = Array.from(byDate.values()).map((h) => ({
    date: h.date,
    name: h.name,
    source: "api" as const,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("holidays")
      .upsert(rows, { onConflict: "date" });
    if (error) throw error;
  }

  return {
    months: months.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}`),
    fetched: fetched.length,
    upserted: rows.length,
    skippedManual,
  };
}

/** from~to(양끝 포함) 구간의 공휴일 날짜 집합. 반납일 계산에 사용한다. */
export async function loadHolidaySet(
  supabase: Client,
  from: string,
  to: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("holidays")
    .select("date")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { date: string }).date));
}

/**
 * 반납기한을 공휴일까지 반영해 계산한다.
 *
 * 공휴일 조회에 실패해도(마이그레이션 미적용, 일시적 DB 오류 등) 대여 자체가 막히면 안 되므로,
 * 실패 시에는 주말만 반영하는 계산으로 폴백한다(기한이 공휴일에 걸릴 수는 있어도 대여는 성립).
 */
export async function resolveDueDate(
  supabase: Client,
  rentedAt: Date | string,
): Promise<string> {
  const start = toKstDate(rentedAt);
  // 대여기간 + 이월 상한을 모두 덮는 여유 구간을 한 번에 읽어둔다.
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 45);

  let holidays: Set<string>;
  try {
    holidays = await loadHolidaySet(supabase, start, end.toISOString().slice(0, 10));
  } catch (e) {
    console.error("[holidays] loadHolidaySet failed, weekend-only fallback:", e);
    holidays = new Set();
  }
  return computeDueDate(rentedAt, holidays);
}

export type AdjustResult = { checked: number; adjusted: number };

/**
 * 아직 기한이 남은 대여(active, due_date >= 지금) 중 반납일이 주말·공휴일인 건을
 * 다음 영업일로 이월한다.
 *
 * - 이미 연체(overdue)이거나 기한이 지난 건은 손대지 않는다(사후 변경은 혼란만 준다).
 * - 영업일로 옮긴 뒤에는 다시 옮겨지지 않으므로 매번 실행해도 안전하다(멱등).
 * - 임시공휴일이 뒤늦게 지정된 경우에도 이 루틴이 기한을 바로잡아 준다.
 */
export async function adjustFutureDueDates(
  supabase: Client,
  now: Date = new Date(),
): Promise<AdjustResult> {
  const { data, error } = await supabase
    .from("rentals")
    .select("id, due_date")
    .eq("status", "active")
    .gte("due_date", now.toISOString());
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; due_date: string }>;
  if (rows.length === 0) return { checked: 0, adjusted: 0 };

  const dates = rows.map((r) => toKstDate(r.due_date)).sort();
  const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 45);
  const holidays = await loadHolidaySet(
    supabase,
    dates[0],
    end.toISOString().slice(0, 10),
  );

  let adjusted = 0;
  for (const r of rows) {
    const cur = toKstDate(r.due_date);
    const next = nextBusinessDay(cur, holidays);
    if (next === cur) continue;
    const { error: updErr } = await supabase
      .from("rentals")
      .update({ due_date: toKstEndOfDay(next) })
      .eq("id", r.id);
    if (updErr) throw updErr;
    adjusted++;
  }
  return { checked: rows.length, adjusted };
}
