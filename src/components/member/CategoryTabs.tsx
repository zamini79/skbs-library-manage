import Link from "next/link";
import { BOOK_CATEGORIES, type BookCategory } from "@/lib/policies";
import { cn } from "@/lib/utils";

export function CategoryTabs({ current }: { current?: BookCategory }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/"
        className={cn("category-chip", !current && "active")}
      >
        전체
      </Link>
      {BOOK_CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`/?category=${encodeURIComponent(cat)}`}
          className={cn("category-chip", current === cat && "active")}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}
