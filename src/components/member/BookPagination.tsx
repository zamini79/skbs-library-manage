import Link from "next/link";
import { cn } from "@/lib/utils";

type BaseParams = {
  category?: string;
  sort?: string;
  dir?: string;
};

function buildHref(page: number, base: BaseParams): string {
  const params = new URLSearchParams();
  if (base.category) params.set("category", base.category);
  if (base.sort && base.sort !== "title") params.set("sort", base.sort);
  if (base.dir && base.dir !== "asc") params.set("dir", base.dir);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

// 10개 페이지 그룹 단위 + 첫/마지막 페이지 + 생략(…) 패턴
function getPageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 1) return [];
  const result: Array<number | "ellipsis"> = [];
  const groupStart = Math.floor((current - 1) / 10) * 10 + 1;
  const groupEnd = Math.min(groupStart + 9, total);

  if (groupStart > 1) {
    result.push(1);
    if (groupStart > 2) result.push("ellipsis");
  }
  for (let i = groupStart; i <= groupEnd; i++) result.push(i);
  if (groupEnd < total) {
    if (groupEnd < total - 1) result.push("ellipsis");
    result.push(total);
  }
  return result;
}

export function BookPagination({
  current,
  total,
  baseParams,
}: {
  current: number;
  total: number;
  baseParams: BaseParams;
}) {
  if (total <= 1) return null;

  const items = getPageItems(current, total);
  const atStart = current <= 1;
  const atEnd = current >= total;

  const navBtn =
    "w-9 h-9 inline-flex items-center justify-center rounded-md border bg-card transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1 text-sm flex-wrap">
      <Link
        href={buildHref(Math.max(1, current - 1), baseParams)}
        aria-disabled={atStart}
        tabIndex={atStart ? -1 : 0}
        className={cn(
          navBtn,
          atStart
            ? "pointer-events-none opacity-40"
            : "hover:bg-muted hover:border-foreground",
        )}
        aria-label="이전 페이지"
      >
        ←
      </Link>

      {items.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e${i}`}
            className="w-7 h-9 inline-flex items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p, baseParams)}
            aria-current={p === current ? "page" : undefined}
            className={cn(
              "min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-md border text-xs font-mono tabular transition-colors",
              p === current
                ? "bg-foreground text-background border-foreground"
                : "bg-card hover:bg-muted hover:border-foreground",
            )}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={buildHref(Math.min(total, current + 1), baseParams)}
        aria-disabled={atEnd}
        tabIndex={atEnd ? -1 : 0}
        className={cn(
          navBtn,
          atEnd
            ? "pointer-events-none opacity-40"
            : "hover:bg-muted hover:border-foreground",
        )}
        aria-label="다음 페이지"
      >
        →
      </Link>
    </nav>
  );
}
