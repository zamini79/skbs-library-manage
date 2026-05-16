import Link from "next/link";
import { cn } from "@/lib/utils";

export function BookPagination({
  current,
  total,
  prevHref,
  nextHref,
}: {
  current: number;
  total: number;
  prevHref: string;
  nextHref: string;
}) {
  const atStart = current <= 1;
  const atEnd = current >= total;

  return (
    <div className="flex items-center gap-2">
      <Link
        href={prevHref}
        aria-disabled={atStart}
        tabIndex={atStart ? -1 : 0}
        className={cn(
          "w-9 h-9 inline-flex items-center justify-center rounded-md border bg-card text-lg transition-colors",
          atStart
            ? "pointer-events-none opacity-40"
            : "hover:bg-muted hover:border-foreground",
        )}
      >
        ←
      </Link>
      <div className="px-3 py-1.5 font-mono tabular text-xs text-muted-foreground min-w-[64px] text-center">
        {current} / {total}
      </div>
      <Link
        href={nextHref}
        aria-disabled={atEnd}
        tabIndex={atEnd ? -1 : 0}
        className={cn(
          "w-9 h-9 inline-flex items-center justify-center rounded-md border bg-card text-lg transition-colors",
          atEnd
            ? "pointer-events-none opacity-40"
            : "hover:bg-muted hover:border-foreground",
        )}
      >
        →
      </Link>
    </div>
  );
}
