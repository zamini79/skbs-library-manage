import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookStatusBadge } from "@/components/member/BookStatusBadge";

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

  const cover = book.cover_url || book.cover_url_external;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← 목록으로
      </Link>

      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <div className="aspect-[2/3] bg-gradient-to-br from-muted to-border rounded-md overflow-hidden relative">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-muted-foreground">
              📖
            </div>
          )}
          <div className="absolute top-3 right-3">
            <BookStatusBadge book={book} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {book.category}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
            <div className="text-md text-muted-foreground">
              {book.author} · {book.publisher}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <dt className="text-muted-foreground">ISBN</dt>
            <dd className="font-mono">{book.isbn || "—"}</dd>

            <dt className="text-muted-foreground">정가</dt>
            <dd className="font-mono tabular">{book.price.toLocaleString()}원</dd>

            <dt className="text-muted-foreground">가용 수량</dt>
            <dd className="font-mono tabular">
              {book.available_quantity} / {book.total_quantity}권
            </dd>

            <dt className="text-muted-foreground">누적 대여</dt>
            <dd className="font-mono tabular">{rentalCount ?? 0}회</dd>
          </dl>
        </div>
      </div>

      {book.description && (
        <section className="space-y-3 pt-4 border-t">
          <h2 className="text-lg font-semibold">책 소개 및 줄거리</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
            {book.description}
          </p>
        </section>
      )}
    </div>
  );
}
