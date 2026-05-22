import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/member/BookCover";
import { cn } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!UUID_RE.test(params.id)) {
    notFound();
  }

  const supabase = createClient();

  const { data: book, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !book) {
    notFound();
  }

  const { count: rentalCount } = await supabase
    .from("rentals")
    .select("*", { count: "exact", head: true })
    .eq("book_id", book.id);

  const available = book.available_quantity > 0;

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors"
      >
        ← 목록으로
      </Link>

      <div className="grid md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-start">
        {/* 좌측 — sticky 표지 */}
        <div className="md:sticky md:top-20 flex justify-center md:justify-start">
          <BookCover book={book} width={280} />
        </div>

        {/* 우측 — 메타 */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-ink-muted tracking-overline uppercase">
              {book.category}
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-ink leading-tight">
              {book.title}
            </h1>
            <div className="text-ink-soft">
              {book.author} · {book.publisher}
            </div>
          </div>

          {/* 대출 상태 strip */}
          <div
            className={cn(
              "border rounded-md px-4 py-3 flex items-center gap-3 text-sm",
              available
                ? "bg-ok-soft border-ok-border text-ok"
                : "bg-busy-soft border-busy-border text-busy",
            )}
          >
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full",
                available ? "bg-ok" : "bg-busy",
              )}
              aria-hidden="true"
            />
            <span className="font-medium">
              {available ? "대출 가능" : "대출중"}
            </span>
            <span className="ml-auto font-mono tabular text-ink-soft">
              {book.available_quantity} / {book.total_quantity}권
            </span>
          </div>

          {/* 서지 정보 */}
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm pt-4 border-t border-line">
            <dt className="text-ink-muted">ISBN</dt>
            <dd className="font-mono text-ink">{book.isbn || "—"}</dd>

            <dt className="text-ink-muted">정가</dt>
            <dd className="font-mono tabular text-ink">
              {book.price.toLocaleString()}원
            </dd>

            <dt className="text-ink-muted">누적 대여</dt>
            <dd className="font-mono tabular text-ink">{rentalCount ?? 0}회</dd>
          </dl>

          {/* 책 소개 */}
          {book.description && (
            <section className="space-y-3 pt-6 border-t border-line">
              <h2 className="font-serif text-xl font-bold text-ink">
                책 소개 및 줄거리
              </h2>
              <p className="text-sm text-ink leading-[1.75] whitespace-pre-line">
                {book.description}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
