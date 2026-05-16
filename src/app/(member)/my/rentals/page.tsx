// 내 대여현황 — 로그인 필수. RLS rentals_select_own로 본인 데이터만 자동 필터링.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RENTAL_POLICY } from "@/lib/policies";

type RentalRow = {
  id: string;
  status: "active" | "overdue" | "returned";
  rented_at: string;
  due_date: string;
  returned_at: string | null;
  book: { id: string; title: string; author: string } | null;
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

function statusBadge(s: RentalRow["status"], due: string) {
  if (s === "overdue") return <span className="badge-overdue">연체 D+{Math.abs(daysUntil(due))}</span>;
  if (s === "returned") return <span className="badge-returned">반납완료</span>;
  const d = daysUntil(due);
  return <span className="badge-active">D-{d > 0 ? d : 0}</span>;
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
         book:books!book_id (id, title, author)`,
      )
      .eq("user_id", user.id)
      .in("status", ["active", "overdue"])
      .order("due_date", { ascending: true }),
    supabase
      .from("rentals")
      .select(
        `id, status, rented_at, due_date, returned_at,
         book:books!book_id (id, title, author)`,
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
  const monthlyRemaining = Math.max(0, RENTAL_POLICY.MAX_MONTHLY_RENTALS - monthlyCount);
  const holdingRemaining = Math.max(0, RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS - activeCount);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">내 대여현황</h1>
        <p className="text-sm text-muted-foreground">
          {profile.name}님 · {profile.department} · 사번 {profile.employee_no}
        </p>
      </header>

      {/* 상태 카드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            마일리지
          </div>
          <div className="font-mono tabular text-2xl font-bold">
            {profile.mileage.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">점</span>
          </div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            이번 달 대여
          </div>
          <div className="font-mono tabular text-2xl font-bold">
            {monthlyCount}<span className="text-sm font-normal text-muted-foreground"> / {RENTAL_POLICY.MAX_MONTHLY_RENTALS}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">잔여 {monthlyRemaining}회</div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            현재 보유
          </div>
          <div className="font-mono tabular text-2xl font-bold">
            {activeCount}<span className="text-sm font-normal text-muted-foreground"> / {RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">잔여 {holdingRemaining}권</div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            이메일
          </div>
          <div className="font-mono text-xs break-all">{profile.email}</div>
        </div>
      </section>

      {/* 현재 대여 중 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">현재 대여 중</h2>
        {activeRentals.length === 0 ? (
          <div className="bg-muted rounded-md p-8 text-center text-sm text-muted-foreground">
            <div className="text-2xl mb-2">📚</div>
            현재 대여 중인 도서가 없습니다.
          </div>
        ) : (
          <ul className="bg-card border rounded-md divide-y">
            {activeRentals.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{r.book?.title ?? "(삭제됨)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.book?.author} · 대여 {fmtDate(r.rented_at)} → 반납기한 {fmtDate(r.due_date)}
                  </div>
                </div>
                <div>{statusBadge(r.status, r.due_date)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 과거 이력 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">대여 이력</h2>
        {history.length === 0 ? (
          <div className="bg-muted rounded-md p-6 text-center text-sm text-muted-foreground">
            반납 완료된 대여가 없습니다.
          </div>
        ) : (
          <ul className="bg-card border rounded-md divide-y">
            {history.map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {r.book?.title ?? "(삭제됨)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.book?.author} · 대여 {fmtDate(r.rented_at)} · 반납{" "}
                    {r.returned_at ? fmtDate(r.returned_at) : "?"}
                  </div>
                </div>
                <div>{statusBadge("returned", r.due_date)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 정책 */}
      <section className="bg-card border rounded-md p-4 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground mb-2">대여 정책</div>
        <div>대여 기간: {RENTAL_POLICY.RENTAL_PERIOD_DAYS}일</div>
        <div>월 최대 대여: {RENTAL_POLICY.MAX_MONTHLY_RENTALS}회 (매월 1일 리셋)</div>
        <div>동시 보유: 최대 {RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS}권</div>
        <div>마일리지: 정상 반납 +10점 · 연체 반납 -5점</div>
      </section>
    </div>
  );
}
