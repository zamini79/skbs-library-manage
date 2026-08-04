"use client";

// 지정한 날짜의 대출 건수 — 값이 하나뿐인 지표라 차트 대신 수치 타일로 표시한다.
// 날짜를 바꾸면 대시보드 전체를 다시 그리지 않고 통계 API 만 재조회한다.
import { useEffect, useState } from "react";

export function DailyRentalCard({
  initialDate,
  initialCount,
}: {
  initialDate: string;
  initialCount: number;
}) {
  const [date, setDate] = useState(initialDate);
  const [count, setCount] = useState<number | null>(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기값은 서버에서 이미 계산해 내려주므로 재조회하지 않는다.
    if (date === initialDate) {
      setCount(initialCount);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/stats/daily-rentals?date=${date}`)
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
  }, [date, initialDate, initialCount]);

  return (
    <div className="bg-card border rounded-md p-5 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">일자별 대출</h2>
        <input
          type="date"
          value={date}
          max={initialDate}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="조회할 날짜"
          className="border rounded px-2 py-1 text-sm bg-background"
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
              {date === initialDate ? "오늘" : date} 대출 건수
            </div>
          </>
        )}
      </div>
    </div>
  );
}
