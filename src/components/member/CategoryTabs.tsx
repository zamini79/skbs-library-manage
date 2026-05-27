import Link from "next/link";
import { BOOK_CATEGORIES, type BookCategory } from "@/lib/policies";
import { cn } from "@/lib/utils";

export function CategoryTabs({ current }: { current?: BookCategory }) {
  return (
    // 모바일: 한 줄 가로 스크롤 (scrollbar 숨김)
    // 데스크탑(md+): 여러 줄 wrap
    <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
      <div className="flex flex-nowrap md:flex-wrap gap-2">
        <Link
          href="/"
          className={cn(
            "category-chip shrink-0 md:shrink md:py-0.5 md:leading-tight",
            !current && "active",
          )}
        >
          전체
        </Link>
        {BOOK_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/?category=${encodeURIComponent(cat)}`}
            className={cn(
              "category-chip shrink-0 md:shrink md:py-0.5 md:leading-tight",
              current === cat && "active",
            )}
          >
            {cat}
          </Link>
        ))}
      </div>
    </div>
  );
}
