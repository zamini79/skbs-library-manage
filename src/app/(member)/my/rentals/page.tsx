// 내 대여현황 — 로그인 필수. RLS rentals_select_own로 본인 데이터만 자동 필터링.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RENTAL_POLICY } from "@/lib/policies";
import { BookCover } from "@/components/member/BookCover";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type BookRow = Database["public"]["Tables"]["books"]["Row"];

type RentalRow = {
  id: string;
  status: "active" | "overdue" | "returned";
  rented_at: string;
  due_date: string;
  returned_at: string | null;
  book: Pick<
    BookRow,
    "id" | "title" | "author" | "category" | "cover_url" | "cover_url_external"
  > | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function daysUntil(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function StatusPill({ row }: { row: Pick<RentalRow, "status" | "due_date"> }) {
  const base =
    "inline-block px-2.5 py-1 rounded-pill text-xs font-bold tracking-wide whitespace-nowrap";
  if (row.status === "overdue") {
    return (
      <span className={cn(base, "bg-busy-soft text-busy")}>
        연체 D+{Math.abs(daysUntil(row.due_date))}
      </span>
    );
  }
  if (row.status === "returned") {
    return (
      <span className={cn(base, "bg-line-soft text-ink-muted")}>반납완료</span>
    );
  }
  const d = daysUntil(row.due_date);
  const soon = d <= 7;
  return (
    <span
      className={cn(
        base,
        soon ? "bg-busy-soft text-busy" : "bg-ok-soft text-ok",
      )}
    >
      D-{d > 0 ? d : 0}
    </span>
  );
}

function CoverThumb({ book }: { book: RentalRow["book"] }) {
  if (!book) {
    return (
      <div className="flex-shrink-0 w-[72px] aspect-[1/1.45] bg-line-soft rounded-cover border border-line" />
    );
  }
  return (
    <div className="flex-shrink-0">
      <BookCover book={book} width={72} shadow={false} />
    </div>
  );
}

export default async function MyRentalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my/rentals");

  const { data: profile } = await supabase
    .from("users")
    .select("name, employee_no, department, mileage, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/signup/complete");

  const startOfMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const [activeRes, historyRes, monthlyRes] = await Promise.all([
    supabase
      .from("rentals")
      .select(
        `id, status, rented_at, due_date, returned_at,
         book:books!book_id (id, title, author, category, cover_url, cover_url_external)`,
      )
      .eq("user_id", user.id)
      .in("status", ["active", "overdue"])
      .order("due_date", { ascending: true }),
    supabase
      .from("rentals")
      .select(
        `id, status, rented_at, due_date, returned_at,
         book:books!book_id (id, title, author, category, cover_url, cover_url_external)`,
      )
      .eq("user_id", user.id)
      .eq("status", "returned")
      .order("returned_at", { ascending: false })
      .limit(30),
    supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("rented_at", startOfMonth),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeRentals: RentalRow[] = (activeRes.data ?? []) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: RentalRow[] = (historyRes.data ?? []) as any;
  const activeCount = activeRentals.length;
  const monthlyCount = monthlyRes.count ?? 0;
  const monthlyRemaining = Math.max(
    0,
    RENTAL_POLICY.MAX_MONTHLY_RENTALS - monthlyCount,
  );
  const holdingRemaining = Math.max(
    0,
    RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS - activeCount,
  );

  const statCardClass =
    "bg-paper border border-line rounded-md p-4 space-y-1";
  const statLabelClass =
    "text-xs text-ink-muted uppercase tracking-overline";
  const statValueClass = "font-mono tabular text-2xl font-bold text-ink";
  const statSubClass = "text-sm font-normal text-ink-muted";

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="md:hidden text-[11px] text-library-accent tracking-overline uppercase font-bold">
          MY SHELF
        </div>
        <h1 className="font-serif text-[22px] md:text-3xl font-bold tracking-tight text-ink leading-[1.15]">
          <span className="md:hidden">{profile.name}님의 책장</span>
          <span className="hidden md:inline">내 대여현황</span>
        </h1>
        <p className="text-sm text-ink-soft">
          {profile.department} · 사번 {profile.employee_no} · 대출중{" "}
          <span className="font-mono text-ink">{activeCount}</span> · 완독{" "}
          <span className="font-mono text-ink">{history.length}</span>
        </p>
      </header>

      {/* 상태 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={statCardClass}>
          <div className={statLabelClass}>마일리지</div>
          <div className={statValueClass}>
            {profile.mileage.toLocaleString()}
            <span className={cn(statSubClass, "ml-1")}>점</span>
          </div>
        </div>
        <div className={statCardClass}>
          <div className={statLabelClass}>이번 달 대여</div>
          <div className={statValueClass}>
            {monthlyCount}
            <span className={statSubClass}>
              {" "}
              / {RENTAL_POLICY.MAX_MONTHLY_RENTALS}
            </span>
          </div>
          <div className="text-xs text-ink-muted">잔여 {monthlyRemaining}회</div>
        </div>
        <div className={statCardClass}>
          <div className={statLabelClass}>현재 보유</div>
          <div className={statValueClass}>
            {activeCount}
            <span className={statSubClass}>
              {" "}
              / {RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS}
            </span>
          </div>
          <div className="text-xs text-ink-muted">잔여 {holdingRemaining}권</div>
        </div>
        <div className={statCardClass}>
          <div className={statLabelClass}>이메일</div>
          <div className="font-mono text-xs break-all text-ink">
            {profile.email}
          </div>
        </div>
      </section>

      {/* 현재 대여 중 */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold text-ink">현재 대여 중</h2>
        {activeRentals.length === 0 ? (
          <div className="bg-paper border border-line rounded-md p-8 text-center text-sm text-ink-muted space-y-2">
            <div className="text-2xl">📚</div>
            <div>현재 대여 중인 도서가 없습니다.</div>
          </div>
        ) : (
          <ul className="bg-paper border border-line rounded-md divide-y divide-line">
            {activeRentals.map((r) => {
              const d = daysUntil(r.due_date);
              const soon = r.status === "overdue" || d <= 7;
              return (
                <li key={r.id} className="p-4 flex items-center gap-4">
                  <CoverThumb book={r.book} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-serif text-base font-bold text-ink truncate">
                      {r.book?.title ?? "(삭제됨)"}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {r.book?.author}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        soon ? "text-busy" : "text-ink-muted",
                      )}
                    >
                      대여 {fmtDate(r.rented_at)} · 반납기한{" "}
                      <span className="font-mono tabular">
                        {fmtDate(r.due_date)}
                      </span>
                    </div>
                  </div>
                  <StatusPill row={r} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 과거 이력 */}
      <section className="space-y-3">
        <h2 className="font-serif text-[17px] md:text-xl font-bold text-ink">
          대여 이력
        </h2>
        {history.length === 0 ? (
          <div className="bg-paper border border-line rounded-md p-6 text-center text-sm text-ink-muted">
            반납 완료된 대여가 없습니다.
          </div>
        ) : (
          <>
            {/* 모바일: 3-col grid (표지 + 짧은 제목) */}
            <div className="md:hidden grid grid-cols-3 gap-x-3 gap-y-5">
              {history.map((r) => (
                <Link
                  key={r.id}
                  href={r.book ? `/books/${r.book.id}` : "/"}
                  className="group"
                >
                  {r.book ? (
                    <BookCover book={r.book} width={106} fluid />
                  ) : (
                    <div className="w-full aspect-[1/1.45] bg-line-soft rounded-cover border border-line" />
                  )}
                  <div className="font-serif text-[12px] font-bold text-ink leading-tight line-clamp-2 mt-2 group-hover:text-library-accent transition-colors">
                    {r.book?.title ?? "(삭제됨)"}
                  </div>
                  <div className="text-[10px] text-ink-muted font-mono tabular mt-0.5">
                    {r.returned_at ? fmtDate(r.returned_at) : "—"}
                  </div>
                </Link>
              ))}
            </div>

            {/* 데스크탑: list */}
            <ul className="hidden md:block bg-paper border border-line rounded-md divide-y divide-line">
              {history.map((r) => (
                <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                  <CoverThumb book={r.book} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="font-serif text-base font-bold text-ink truncate">
                      {r.book?.title ?? "(삭제됨)"}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {r.book?.author}
                    </div>
                    <div className="text-xs text-ink-muted">
                      대여{" "}
                      <span className="font-mono tabular">
                        {fmtDate(r.rented_at)}
                      </span>{" "}
                      · 반납{" "}
                      <span className="font-mono tabular">
                        {r.returned_at ? fmtDate(r.returned_at) : "—"}
                      </span>
                    </div>
                  </div>
                  <StatusPill row={r} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 정책 */}
      <section className="bg-paper border border-line rounded-md p-4 text-xs text-ink-soft space-y-1">
        <div className="font-medium text-ink mb-2">대여 정책</div>
        <div>대여 기간: {RENTAL_POLICY.RENTAL_PERIOD_DAYS}일</div>
        <div>
          월 최대 대여: {RENTAL_POLICY.MAX_MONTHLY_RENTALS}회 (매월 1일 리셋)
        </div>
        <div>동시 보유: 최대 {RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS}권</div>
        <div>마일리지: 정상 반납 +10점 · 연체 반납 -5점</div>
      </section>
    </div>
  );
}
