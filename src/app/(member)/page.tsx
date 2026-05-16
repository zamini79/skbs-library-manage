import { createClient } from "@/lib/supabase/server";
import {
  BOOK_CATEGORIES,
  type BookCategory,
} from "@/lib/policies";
import { BookCard } from "@/components/member/BookCard";
import { CategoryTabs } from "@/components/member/CategoryTabs";

function isCategory(v: string | undefined): v is BookCategory {
  return !!v && (BOOK_CATEGORIES as readonly string[]).includes(v);
}

export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();
  const category = isCategory(searchParams.category)
    ? searchParams.category
    : undefined;

  let query = supabase
    .from("books")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data: books, error } = await query;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">도서 조회</h1>
        <p className="text-md text-muted-foreground">
          사내 비치 도서를 카테고리별로 둘러보세요
        </p>
      </header>

      <CategoryTabs current={category} />

      {error ? (
        <div className="p-8 text-center bg-destructive-bg text-destructive rounded-md">
          도서를 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      ) : !books || books.length === 0 ? (
        <div className="p-12 text-center bg-muted rounded-md space-y-2">
          <div className="text-2xl">📚</div>
          <div className="text-md text-muted-foreground">
            {category
              ? `'${category}' 카테고리에 등록된 도서가 없습니다.`
              : "아직 등록된 도서가 없습니다."}
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            총 <span className="font-mono font-medium text-foreground">{books.length}</span>권
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
