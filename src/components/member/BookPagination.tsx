import Link from "next/link";
import { cn } from "@/lib/utils";

type BaseParams = {
  category?: string;
  sort?: string;
  dir?: string;
  q?: string;
};

function buildHref(page: number, base: BaseParams): string {
  const params = new URLSearchParams();
  if (base.category) params.set("category", base.category);
  if (base.sort && base.sort !== "title") params.set("sort", base.sort);
  if (base.dir && base.dir !== "asc") params.set("dir", base.dir);
  if (base.q) params.set("q", base.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

// 페이지 그룹 단위 + 첫/마지막 페이지 + 생략(…) 패턴 (groupSize: 데스크탑 10, 모바일 3)
function getPageItems(
  current: number,
  total: number,
  groupSize: number,
): Array<number | "ellipsis"> {
  if (total <= 1) return [];
  const result: Array<number | "ellipsis"> = [];
  const groupStart = Math.floor((current - 1) / groupSize) * groupSize + 1;
  const groupEnd = Math.min(groupStart + groupSize - 1, total);

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

  const atStart = current <= 1;
  const atEnd = current >= total;
  const prevHref = buildHref(Math.max(1, current - 1), baseParams);
  const nextHref = buildHref(Math.min(total, current + 1), baseParams);

  const renderNav = (groupSize: number, sizing: {
    wrapper: string;
    nav: string;
    page: string;
    ellipsis: string;
  }) => {
    const items = getPageItems(current, total, groupSize);
    return (
      <nav className={sizing.wrapper}>
        <Link
          href={prevHref}
          aria-disabled={atStart}
          tabIndex={atStart ? -1 : 0}
          className={cn(
            sizing.nav,
            atStart
              ? "pointer-events-none opacity-40"
              : "hover:bg-line-soft hover:border-ink-soft",
          )}
          aria-label="이전 페이지"
        >
          ←
        </Link>

        {items.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`e${i}`}
              className={sizing.ellipsis}
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
                sizing.page,
                p === current
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper border-line text-ink hover:bg-line-soft hover:border-ink-soft",
              )}
            >
              {p}
            </Link>
          ),
        )}

        <Link
          href={nextHref}
          aria-disabled={atEnd}
          tabIndex={atEnd ? -1 : 0}
          className={cn(
            sizing.nav,
            atEnd
              ? "pointer-events-none opacity-40"
              : "hover:bg-line-soft hover:border-ink-soft",
          )}
          aria-label="다음 페이지"
        >
          →
        </Link>
      </nav>
    );
  };

  return (
    <>
      {/* 모바일: 그룹 5, 작은 버튼, 한 줄 고정 */}
      <div className="sm:hidden">
        {renderNav(5, {
          wrapper: "flex items-center justify-center gap-0.5 text-xs flex-nowrap",
          nav: "w-7 h-7 inline-flex items-center justify-center rounded-md border border-line bg-paper text-ink transition-colors shrink-0",
          page: "min-w-7 h-7 px-1 inline-flex items-center justify-center rounded-md border text-[11px] font-mono tabular transition-colors shrink-0",
          ellipsis:
            "w-4 h-7 inline-flex items-center justify-center text-ink-muted shrink-0",
        })}
      </div>
      {/* 데스크탑: 그룹 10, 사이즈 30% 축소 (36px → 25px) */}
      <div className="hidden sm:block">
        {renderNav(10, {
          wrapper: "flex items-center justify-center gap-1 text-sm flex-wrap",
          nav: "w-[25px] h-[25px] inline-flex items-center justify-center rounded-md border border-line bg-paper text-ink transition-colors",
          page: "min-w-[25px] h-[25px] px-1.5 inline-flex items-center justify-center rounded-md border text-xs font-mono tabular transition-colors",
          ellipsis:
            "w-5 h-[25px] inline-flex items-center justify-center text-ink-muted",
        })}
      </div>
    </>
  );
}
