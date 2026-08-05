"use client";

// 기간별 대출 — 기간(최대 한 달)을 지정하면 그 구간의 일별 대출 건수를 막대로 보여준다.
// 단일 계열이라 범례 없이 제목으로 식별하고, 막대가 최대 31개라 값 표기는 툴팁에 맡긴다.
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DayBucket } from "@/lib/kst";

type Props = {
  /** 서버에서 계산해 내려준 초기 기간(양끝 포함)과 그 결과 */
  initialFrom: string;
  initialTo: string;
  initialDaily: DayBucket[];
  /** 선택 가능한 마지막 날짜(오늘, KST) */
  maxDate: string;
  /** 허용 최대 기간(일) */
  maxDays: number;
};

/** 양끝 포함 일수 (from > to 면 0) */
function dayCount(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function RangeRentalChart({
  initialFrom,
  initialTo,
  initialDaily,
  maxDate,
  maxDays,
}: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [daily, setDaily] = useState<DayBucket[]>(initialDaily);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = dayCount(from, to);
  const invalidOrder = from > to;
  const tooLong = days > maxDays;

  useEffect(() => {
    if (invalidOrder) {
      setError("시작일이 종료일보다 늦습니다.");
      return;
    }
    if (tooLong) {
      setError(`기간은 최대 ${maxDays}일까지 조회할 수 있습니다.`);
      return;
    }
    // 초기값은 서버에서 이미 계산해 내려주므로 재조회하지 않는다.
    if (from === initialFrom && to === initialTo) {
      setDaily(initialDaily);
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
          setError("조회에 실패했습니다.");
          return;
        }
        setDaily(json.daily as DayBucket[]);
      })
      .catch(() => {
        if (!cancelled) setError("조회에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    from,
    to,
    invalidOrder,
    tooLong,
    maxDays,
    initialFrom,
    initialTo,
    initialDaily,
  ]);

  const total = daily.reduce((s, d) => s + d.count, 0);
  const perDay = days > 0 ? (total / days).toFixed(1) : "0";
  const inputClass = "border rounded px-2 py-1 text-xs bg-background min-w-0";

  return (
    <div className="bg-card border rounded-md p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">기간별 대출</h2>
        {!error && (
          <span className="text-xs text-muted-foreground">
            합계 <span className="tabular font-medium">{total}</span>회 · 일평균{" "}
            <span className="tabular font-medium">{perDay}</span>회
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={maxDate}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
          aria-label="조회 시작일"
          className={`${inputClass} flex-1`}
        />
        <span className="text-xs text-muted-foreground shrink-0">~</span>
        <input
          type="date"
          value={to}
          max={maxDate}
          onChange={(e) => e.target.value && setTo(e.target.value)}
          aria-label="조회 종료일"
          className={`${inputClass} flex-1`}
        />
      </div>

      {error ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-destructive text-center px-4">
          {error}
        </div>
      ) : (
        <div className={loading ? "opacity-40 transition-opacity" : ""}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={daily}
              margin={{ top: 10, bottom: 4, left: 0, right: 8 }}
            >
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                allowDecimals={false}
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                width={32}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value) => [`${value}회`, "대출"]}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.date ?? String(label)
                }
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
