// 관리자 대시보드 — Phase 1 가이드 Day 7
import { requireAny, adminRoleLabel } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { TopBarChart } from "@/components/admin/dashboard/TopBarChart";
import { RentalListPanel } from "@/components/admin/dashboard/RentalListPanel";

export default async function AdminDashboardPage() {
  const admin = await requireAny();
  const supabase = createAdminClient();

  const startOfMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const [
    booksRes,
    activeRes,
    overdueRes,
    monthlyRes,
    allRentalsRes,
    recentRes,
    overdueListRes,
  ] = await Promise.all([
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "overdue"]),
    supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .eq("status", "overdue"),
    supabase
      .from("rentals")
      .select("id", { count: "exact", head: true })
      .gte("rented_at", startOfMonth),
    supabase
      .from("rentals")
      .select(
        `user_id, book_id, user:users!user_id (id, name), book:books!book_id (id, title)`,
      ),
    supabase
      .from("rentals")
      .select(
        `id, status, rented_at, due_date,
         book:books!book_id (title), user:users!user_id (name)`,
      )
      .order("rented_at", { ascending: false })
      .limit(5),
    supabase
      .from("rentals")
      .select(
        `id, status, rented_at, due_date,
         book:books!book_id (title), user:users!user_id (name)`,
      )
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  // TOP10 집계 (Node 측)
  const userCounts = new Map<string, { label: string; count: number }>();
  const bookCounts = new Map<string, { label: string; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (allRentalsRes.data ?? []) as any[]) {
    if (r.user?.id && r.user?.name) {
      const cur = userCounts.get(r.user.id);
      if (cur) cur.count++;
      else userCounts.set(r.user.id, { label: r.user.name, count: 1 });
    }
    if (r.book?.id && r.book?.title) {
      const cur = bookCounts.get(r.book.id);
      if (cur) cur.count++;
      else bookCounts.set(r.book.id, { label: r.book.title, count: 1 });
    }
  }
  const topUsers = Array.from(userCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topBooks = Array.from(bookCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-md text-muted-foreground mt-1">
          {admin.name} ({adminRoleLabel(admin.role)})
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="전체 도서" value={booksRes.count ?? 0} variant="accent" />
        <KpiCard label="대여 중" value={activeRes.count ?? 0} />
        <KpiCard
          label="연체"
          value={overdueRes.count ?? 0}
          variant="danger"
        />
        <KpiCard
          label="이번 달 신규 대여"
          value={monthlyRes.count ?? 0}
          delta="매월 1일 리셋"
        />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <TopBarChart title="개인별 대여 TOP 10" data={topUsers} />
        <TopBarChart title="도서별 대여 TOP 10" data={topBooks} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <RentalListPanel
          title="최근 대여 내역"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rentals={(recentRes.data ?? []) as any}
          emptyText="대여 내역이 없습니다"
        />
        <RentalListPanel
          title="연체 목록"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rentals={(overdueListRes.data ?? []) as any}
          emptyText="연체된 대여가 없습니다"
          showStatus={false}
        />
      </section>
    </div>
  );
}
