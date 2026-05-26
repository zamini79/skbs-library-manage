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

const PAGE_SIZE = 18; // PC 1920x1080 기준 9 cols × 2 rows (book 2:3 비율 유지)

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
    <div className="space-y-6">
      {/* 모바일 hero — paper-warm 박스 없이 텍스트만, 가운데 정렬 없이 좌측 정렬 */}
      <section className="md:hidden space-y-3">
        <div className="space-y-2">
          <div className="text-[11px] text-library-accent tracking-overline uppercase font-bold">
            TODAY · SK BIOSCIENCE LIBRARY
          </div>
          <h1 className="font-serif text-[23px] font-bold tracking-tight text-ink leading-[1.1] [text-wrap:balance]">
            오늘, 어떤 책장을 열어볼까요?
          </h1>
          <p className="text-xs text-ink-soft">
            총{" "}
            <span className="font-mono font-medium text-ink">
              {(count ?? 0).toLocaleString()}
            </span>
            권 등록
            {rawQ && (
              <>
                {" "}
                · <span className="text-ink">&ldquo;{rawQ}&rdquo;</span> 검색 결과
              </>
            )}
          </p>
        </div>
        <BookSearch />
      </section>

      {/* 데스크탑 editorial hero (paper-warm 박스 + 검색바) — 1920×1080 한 화면 수용 위해 컴팩트화 */}
      <section className="hidden md:block bg-paper-warm border border-line rounded-md px-6 py-4 xl:px-8 xl:py-5">
        <div className="flex flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-[10px] text-ink-muted tracking-overline uppercase">
              SK BIOSCIENCE LIBRARY
            </div>
            <h1 className="font-serif text-2xl xl:text-3xl font-bold tracking-tight text-ink leading-tight">
              오늘, 어떤 책장을 열어볼까요?
            </h1>
            <p className="text-xs text-ink-soft">
              총{" "}
              <span className="font-mono font-medium text-ink">
                {(count ?? 0).toLocaleString()}
              </span>
              권 등록
              {rawQ && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-ink">
                    &ldquo;{rawQ}&rdquo;
                  </span>{" "}
                  검색 결과
                </>
              )}
            </p>
          </div>
          <div className="flex-shrink-0">
            <BookSearch />
          </div>
        </div>
      </section>

      {/* 모바일: 카테고리 한 줄, 정렬+페이지는 다음 줄 */}
      <div className="md:hidden space-y-3">
        <CategoryTabs current={category} />
        <div className="flex items-center justify-between gap-2">
          <BookSortFilter current={sort} dir={dir} />
          <span className="text-xs text-ink-muted font-mono tabular">
            페이지 {currentPage} / {totalPages}
          </span>
        </div>
      </div>

      {/* 데스크탑: 카테고리 + 정렬 + 페이지를 한 줄에 */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        <div className="flex-1 min-w-0">
          <CategoryTabs current={category} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <BookSortFilter current={sort} dir={dir} />
          <span className="text-xs text-ink-muted font-mono tabular whitespace-nowrap">
            페이지 {currentPage} / {totalPages}
          </span>
        </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-x-4 gap-y-6 md:gap-3">
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
