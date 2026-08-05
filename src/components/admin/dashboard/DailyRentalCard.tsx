"use client";

// 기간별 대출 건수 — 값이 하나뿐인 지표라 차트 대신 수치 타일로 표시한다.
// 기간을 바꾸면 대시보드 전체를 다시 그리지 않고 통계 API 만 재조회한다.
import { useEffect, useState } from "react";

type Props = {
  /** 서버에서 계산해 내려준 초기 기간(양끝 포함)과 그 건수 */
  initialFrom: string;
  initialTo: string;
  initialCount: number;
  /** 선택 가능한 마지막 날짜(오늘, KST) */
  maxDate: string;
};

/** 양끝 포함 일수 (from > to 면 0) */
function dayCount(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function DailyRentalCard({
  initialFrom,
  initialTo,
  initialCount,
  maxDate,
}: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [count, setCount] = useState<number | null>(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidRange = from > to;

  useEffect(() => {
    // 시작일이 종료일보다 늦으면 조회하지 않고 안내만 한다.
    if (invalidRange) {
      setError("시작일이 종료일보다 늦습니다.");
      setCount(null);
      return;
    }
    // 초기값은 서버에서 이미 계산해 내려주므로 재조회하지 않는다.
    if (from === initialFrom && to === initialTo) {
      setCount(initialCount);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/stats/daily-rentals?from=${from}&to=${to}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setCount(null);
          setError("조회에 실패했습니다.");
          return;
        }
        setCount(json.count as number);
      })
      .catch(() => {
        if (!cancelled) {
          setCount(null);
          setError("조회에 실패했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, invalidRange, initialFrom, initialTo, initialCount]);

  const days = dayCount(from, to);
  const perDay =
    count !== null && days > 0 ? (count / days).toFixed(1) : null;

  const inputClass =
    "border rounded px-2 py-1 text-xs bg-background w-full min-w-0";

  return (
    <div className="bg-card border rounded-md p-5 flex flex-col">
      <h2 className="text-lg font-semibold">기간별 대출</h2>

      <div className="mt-3 flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={maxDate}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
          aria-label="조회 시작일"
          className={inputClass}
        />
        <span className="text-xs text-muted-foreground shrink-0">~</span>
        <input
          type="date"
          value={to}
          max={maxDate}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          aria-label="조회 종료일"
          className={inputClass}
        />
      </div>

      <div className="mt-auto pt-6">
        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div
              className={`text-4xl font-bold tracking-tight tabular ${
                loading ? "opacity-40" : ""
              }`}
            >
              {count ?? 0}
              <span className="text-lg font-medium text-muted-foreground ml-1">
                회
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {days === 1 ? "1일간" : `${days}일간`}
              {perDay !== null && days > 1 && ` · 일평균 ${perDay}회`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
