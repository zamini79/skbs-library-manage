import { createClient } from "@/lib/supabase/server";
import {
  BOOK_CATEGORIES,
  type BookCategory,
} from "@/lib/policies";
import { BookCard } from "@/components/member/BookCard";
import { CategoryTabs } from "@/components/member/CategoryTabs";
import { BookSortFilter } from "@/components/member/BookSortFilter";
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

function buildHref(
  page: number,
  base: { category?: string; sort?: string; dir?: string },
): string {
  const params = new URLSearchParams();
  if (base.category) params.set("category", base.category);
  if (base.sort && base.sort !== "title") params.set("sort", base.sort);
  if (base.dir && base.dir !== "asc") params.set("dir", base.dir);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    sort?: string;
    dir?: string;
    page?: string;
  };
}) {
  const supabase = createClient();
  const category = isCategory(searchParams.category)
    ? searchParams.category
    : undefined;
  const sort: Sort = isSort(searchParams.sort) ? searchParams.sort : "title";
  const dir: Dir = isDir(searchParams.dir) ? searchParams.dir : "asc";
  const requestedPage = Math.max(1, Number(searchParams.page) || 1);

  let query = supabase
    .from("books")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order(sort, { ascending: dir === "asc" });

  if (category) query = query.eq("category", category);

  const offset = (requestedPage - 1) * PAGE_SIZE;
  const { data: books, count, error } = await query.range(
    offset,
    offset + PAGE_SIZE - 1,
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const baseParams = { category, sort, dir };

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">도서 조회</h1>
        <p className="text-xs text-muted-foreground">
          총 <span className="font-mono font-medium text-foreground">{count ?? 0}</span>권
          · 페이지{" "}
          <span className="font-mono tabular">
            {currentPage} / {totalPages}
          </span>
        </p>
      </header>

      <CategoryTabs current={category} />

      <div className="flex items-center justify-start">
        <BookSortFilter current={sort} dir={dir} />
      </div>

      {error ? (
        <div className="p-6 bg-destructive-bg text-destructive rounded-md">
          오류: {error.message}
        </div>
      ) : !books || books.length === 0 ? (
        <div className="p-10 text-center bg-muted rounded-md space-y-2">
          <div className="text-2xl">📚</div>
          <div className="text-sm text-muted-foreground">
            {category
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
