"use client";

// 월별 대출 추이 — 최근 6개월. 단일 계열이므로 범례 없이 제목으로 식별한다.
// 값이 6개뿐이라 막대 위에 값을 직접 표기하고, 툴팁은 보조로 유지한다.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

export type MonthlyPoint = { label: string; count: number };

export function MonthlyRentalChart({
  title,
  data,
}: {
  title: string;
  data: MonthlyPoint[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-card border rounded-md p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          6개월 합계 <span className="tabular font-medium">{total}</span>회
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 18, bottom: 4, left: 0, right: 8 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            fontSize={11}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
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
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              fontSize={11}
              fill="hsl(var(--muted-foreground))"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
