import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookCover } from "@/components/member/BookCover";
import { RequestBookButton } from "@/components/member/RequestBookButton";
import { cn } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ButtonState =
  | "not-authed"
  | "available"
  | "requested-by-self"
  | "requested-by-other"
  | "unavailable";

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

  const [{ count: rentalCount }, { data: { user } }] = await Promise.all([
    supabase
      .from("rentals")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id),
    supabase.auth.getUser(),
  ]);

  // 책별 pending 요청 조회 (service_role)
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("rental_requests")
    .select("id, user_id")
    .eq("book_id", book.id)
    .eq("status", "pending")
    .maybeSingle();

  const hasPending = !!pending;
  const myPendingRequestId =
    pending && user && pending.user_id === user.id ? pending.id : null;
  const available = book.available_quantity > 0;

  let buttonState: ButtonState;
  if (!user) buttonState = "not-authed";
  else if (myPendingRequestId) buttonState = "requested-by-self";
  else if (hasPending) buttonState = "requested-by-other";
  else if (!available) buttonState = "unavailable";
  else buttonState = "available";

  const statusLabel = hasPending
    ? "대출 승인 대기중"
    : available
      ? "대출 가능"
      : "대출중";
  const statusTone: "ok" | "warn" | "busy" = hasPending
    ? "warn"
    : available
      ? "ok"
      : "busy";

  const statusStripCls = cn(
    "border rounded-md px-4 py-3 flex items-center gap-3 text-sm",
    statusTone === "ok" && "bg-ok-soft border-ok-border text-ok",
    statusTone === "warn" && "bg-busy-soft border-busy-border text-busy",
    statusTone === "busy" && "bg-busy-soft border-busy-border text-busy",
  );
  const statusDotCls = cn(
    "inline-block w-2 h-2 rounded-full",
    statusTone === "ok" && "bg-ok",
    statusTone === "warn" && "bg-busy",
    statusTone === "busy" && "bg-busy",
  );

  return (
    <>
      {/* 데스크탑 layout */}
      <div className="hidden md:block space-y-8">
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

            {/* 대출 상태 + 신청 버튼 — 가운데 정렬 */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <div className={statusStripCls + " w-full sm:w-auto"}>
                <span className={statusDotCls} aria-hidden="true" />
                <span className="font-medium">{statusLabel}</span>
                <span className="ml-auto sm:ml-3 font-mono tabular text-ink-soft">
                  {book.available_quantity} / {book.total_quantity}권
                </span>
              </div>
              <RequestBookButton
                bookId={book.id}
                bookTitle={book.title}
                state={buttonState}
                myPendingRequestId={myPendingRequestId}
                variant="desktop"
              />
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
              <dd className="font-mono tabular text-ink">
                {rentalCount ?? 0}회
              </dd>
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

      {/* 모바일 layout */}
      <div className="md:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors mb-5"
        >
          ← 목록으로
        </Link>

        {/* Hero — 가운데 정렬 */}
        <div className="text-center space-y-4 pb-6 border-b border-line">
          <div className="flex justify-center pt-2">
            <BookCover book={book} width={180} />
          </div>
          <div className="space-y-1.5 px-2">
            <div className="text-[11px] text-library-accent tracking-overline uppercase font-bold">
              {book.category}
            </div>
            <h1 className="font-serif text-[24px] font-bold tracking-tight text-ink leading-[1.05] [text-wrap:balance] max-w-[280px] mx-auto">
              {book.title}
            </h1>
            <div className="text-[13px] text-ink-soft">
              {book.author} · {book.publisher}
            </div>
          </div>
          {/* 대출 상태 + 신청 버튼 — 가운데 정렬, 가로 배치 */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[12px] font-semibold",
                statusTone === "ok" && "bg-ok-soft text-ok",
                statusTone === "warn" && "bg-busy-soft text-busy",
                statusTone === "busy" && "bg-busy-soft text-busy",
              )}
            >
              <span
                className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full",
                  statusTone === "ok" && "bg-ok",
                  statusTone !== "ok" && "bg-busy",
                )}
                aria-hidden="true"
              />
              {hasPending
                ? "대출 승인 대기중"
                : available
                  ? `대출 가능 (${book.available_quantity}/${book.total_quantity}권)`
                  : "대출중"}
            </span>
            <RequestBookButton
              bookId={book.id}
              bookTitle={book.title}
              state={buttonState}
              myPendingRequestId={myPendingRequestId}
              variant="mobile"
            />
          </div>
        </div>

        {/* 책 소개 */}
        {book.description && (
          <section className="pt-6 space-y-2">
            <h2 className="font-serif text-[17px] font-bold text-ink">
              책 소개
            </h2>
            <p className="text-[13.5px] text-ink leading-[1.7] [text-wrap:pretty] whitespace-pre-line">
              {book.description}
            </p>
          </section>
        )}

        {/* 서지 정보 */}
        <section className="pt-7 pb-2">
          <h2 className="font-serif text-[17px] font-bold text-ink mb-2">
            서지 정보
          </h2>
          <dl className="text-[13px] text-ink-soft border-t border-line">
            <div className="flex justify-between py-[10px] border-b border-line">
              <dt>ISBN</dt>
              <dd className="text-ink font-mono">{book.isbn || "—"}</dd>
            </div>
            <div className="flex justify-between py-[10px] border-b border-line">
              <dt>정가</dt>
              <dd className="text-ink font-mono tabular">
                {book.price.toLocaleString()}원
              </dd>
            </div>
            <div className="flex justify-between py-[10px] border-b border-line">
              <dt>누적 대여</dt>
              <dd className="text-ink font-mono tabular">
                {rentalCount ?? 0}회
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
