import { createClient } from "@/lib/supabase/server";
import {
  BOOK_CATEGORIES,
  type BookCategory,
} from "@/lib/policies";
import { safeIlike } from "@/lib/safe-ilike";
import { BookCard } from "@/components/member/BookCard";
import { CategoryTabs } from "@/components/member/CategoryTabs";
import { BookSortFilter } from "@/components/member/BookSortFilter";
import { BookSearch } from "@/components/member/BookSearch";
import { BookPagination } from "@/components/member/BookPagination";

const PAGE_SIZE = 14; // PC 1920x1080 기준 7 cols × 2 rows (book 2:3 비율 유지)

function isCategory(v: string | undefined): v is BookCategory {
  return !!v && (BOOK_CATEGORIES as readonly string[]).includes(v);
}

type Sort = "title" | "author";
function isSort(v: string | undefined): v is Sort {
  return v === "title" || v === "author";
}

type Dir = "asc" | "desc";
function isDir(v: string | undefined): v is Dir {
  return v === "asc" || v === "desc";
}

export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    sort?: string;
    dir?: string;
    page?: string;
    q?: string;
  };
}) {
  const supabase = createClient();
  const category = isCategory(searchParams.category)
    ? searchParams.category
    : undefined;
  const sort: Sort = isSort(searchParams.sort) ? searchParams.sort : "title";
  const dir: Dir = isDir(searchParams.dir) ? searchParams.dir : "asc";
  const requestedPage = Math.max(1, Number(searchParams.page) || 1);
  const rawQ = (searchParams.q ?? "").trim();
  const safeQ = rawQ ? safeIlike(rawQ) : "";

  let query = supabase
    .from("books")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order(sort, { ascending: dir === "asc" });

  if (category) query = query.eq("category", category);
  if (safeQ) {
    query = query.or(`title.ilike.%${safeQ}%,author.ilike.%${safeQ}%`);
  }

  const offset = (requestedPage - 1) * PAGE_SIZE;
  const { data: books, count, error } = await query.range(
    offset,
    offset + PAGE_SIZE - 1,
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const baseParams = { category, sort, dir, q: rawQ || undefined };

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
          도서 조회
        </h1>
        <p className="text-xs text-ink-muted">
          총{" "}
          <span className="font-mono font-medium text-ink">{count ?? 0}</span>권
          · 페이지{" "}
          <span className="font-mono tabular text-ink">
            {currentPage} / {totalPages}
          </span>
        </p>
      </header>

      <CategoryTabs current={category} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <BookSortFilter current={sort} dir={dir} />
        <BookSearch />
      </div>

      {error ? (
        <div className="p-6 bg-destructive-bg text-destructive rounded-md">
          오류: {error.message}
        </div>
      ) : !books || books.length === 0 ? (
        <div className="p-10 text-center bg-muted rounded-md space-y-2">
          <div className="text-2xl">📚</div>
          <div className="text-sm text-muted-foreground">
            {rawQ
              ? `'${rawQ}' 검색 결과가 없습니다.`
              : category
                ? `'${category}' 카테고리에 등록된 도서가 없습니다.`
                : "아직 등록된 도서가 없습니다."}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <div className="pt-2">
            <BookPagination
              current={currentPage}
              total={totalPages}
              baseParams={baseParams}
            />
          </div>
        </>
      )}
    </div>
  );
}
