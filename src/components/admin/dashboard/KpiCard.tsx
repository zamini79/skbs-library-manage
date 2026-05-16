type Variant = "default" | "danger" | "accent";

export function KpiCard({
  label,
  value,
  variant = "default",
  delta,
}: {
  label: string;
  value: number | string;
  variant?: Variant;
  delta?: string;
}) {
  const topBar =
    variant === "danger"
      ? "border-t-destructive border-t-[3px]"
      : variant === "accent"
        ? "border-t-foreground border-t-[3px]"
        : "border-border";

  return (
    <div className={`bg-card p-5 rounded-md border ${topBar}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </div>
      <div
        className={`text-4xl font-bold tracking-tight tabular ${
          variant === "danger" ? "text-destructive" : ""
        }`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {delta && <div className="text-xs text-muted-foreground mt-1.5">{delta}</div>}
    </div>
  );
}
