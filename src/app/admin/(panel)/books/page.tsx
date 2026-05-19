// 관리자 도서 목록 — master 전용. 검색·카테고리·상태 필터 + 페이지네이션 + 폐기.
import Link from "next/link";
import { requireMaster } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  BOOK_CATEGORIES,
  type BookCategory,
} from "@/lib/policies";
import { safeIlike } from "@/lib/safe-ilike";
import { Button } from "@/components/ui/button";
import { BookFilters } from "@/components/admin/BookFilters";
import { BooksTable } from "@/components/admin/BooksTable";

const PAGE_SIZE = 25;

function isCategory(v: string | undefined): v is BookCategory {
  return !!v && (BOOK_CATEGORIES as readonly string[]).includes(v);
}

type Status = "available" | "rented" | "disposed";
function isStatus(v: string | undefined): v is Status {
  return v === "available" || v === "rented" || v === "disposed";
}

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; status?: string; page?: string };
}) {
  await requireMaster();
  const supabase = createClient();

  const q = (searchParams.q || "").trim();
  const category = isCategory(searchParams.category) ? searchParams.category : undefined;
  const status = isStatus(searchParams.status) ? searchParams.status : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("books")
    .select("*", { count: "exact" });

  if (q) {
    const safe = safeIlike(q);
    if (safe) {
      query = query.or(
        `title.ilike.%${safe}%,author.ilike.%${safe}%,publisher.ilike.%${safe}%`,
      );
    }
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (status === "available") {
    query = query.eq("status", "active").gt("available_quantity", 0);
  } else if (status === "rented") {
    query = query.eq("status", "active").eq("available_quantity", 0);
  } else if (status === "disposed") {
    query = query.eq("status", "disposed");
  }

  const { data: books, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageUrl(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">도서 목록</h1>
          <p className="text-md text-muted-foreground mt-1">
            전체 <span className="font-mono font-medium text-foreground">{count ?? 0}</span>권
            (페이지 {page} / {totalPages})
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/books/new">신규 입고</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/books/bulk-upload">엑셀 일괄 업로드</Link>
          </Button>
        </div>
      </header>

      <BookFilters />

      {error ? (
        <div className="p-6 bg-destructive-bg text-destructive rounded-md">
          조회 오류: {error.message}
        </div>
      ) : (
        <BooksTable books={books ?? []} />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1 text-sm">
          <Link
            href={pageUrl(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`px-3 py-1.5 rounded border ${
              page === 1
                ? "pointer-events-none opacity-40"
                : "hover:bg-muted"
            }`}
          >
            이전
          </Link>
          <div className="px-3 py-1.5 font-mono tabular text-muted-foreground">
            {page} / {totalPages}
          </div>
          <Link
            href={pageUrl(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`px-3 py-1.5 rounded border ${
              page === totalPages
                ? "pointer-events-none opacity-40"
                : "hover:bg-muted"
            }`}
          >
            다음
          </Link>
        </nav>
      )}
    </div>
  );
}
