"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function TopBarChart({
  title,
  data,
  unit = "회",
}: {
  title: string;
  data: Array<{ label: string; count: number }>;
  unit?: string;
}) {
  return (
    <div className="bg-card border rounded-md p-5 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 6, bottom: 6, left: 0, right: 24 }}
          >
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              allowDecimals={false}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [`${value}${unit}`, "대여"]}
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
              radius={[0, 3, 3, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
