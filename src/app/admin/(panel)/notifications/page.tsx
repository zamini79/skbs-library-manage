// 관리자 — 알림 발송 이력 모니터링
//
// /api/cron/rental-notifications 가 매일 09:00 KST 에 채우는 rental_notifications
// 테이블을 조회해 KPI / 일별 표 / 최근 발송 상세를 보여준다.
import { requireAny } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";

type NotificationType = "due_2" | "due_1" | "due_0" | "overdue";
const TYPE_LABELS: Record<NotificationType, string> = {
  due_2: "D-2",
  due_1: "D-1",
  due_0: "D-0",
  overdue: "연체",
};
const TYPE_BADGE: Record<NotificationType, string> = {
  due_2: "bg-muted text-foreground",
  due_1: "bg-muted text-foreground",
  due_0: "bg-info-bg text-info",
  overdue: "bg-destructive-bg text-destructive",
};

type Row = {
  id: string;
  notification_type: NotificationType;
  sent_for_date: string; // YYYY-MM-DD
  sent_at: string;
  rental:
    | {
        user: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
        book: { title: string } | { title: string }[] | null;
      }
    | Array<{
        user: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
        book: { title: string } | { title: string }[] | null;
      }>
    | null;
};

function todayKstISODate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function lastNKstDates(n: number): string[] {
  // 최근 N일 (오늘 포함) KST 날짜 배열 — 최신이 앞.
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    out.push(todayKstISODate(d));
  }
  return out;
}

function formatKstDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function pick<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function NotificationsPage() {
  await requireAny();
  const supabase = createAdminClient();

  // 최근 14일치 조회 (충분히 넉넉히)
  const dates14 = lastNKstDates(14);
  const earliest = dates14[dates14.length - 1];

  const { data, error } = await supabase
    .from("rental_notifications")
    .select(
      "id, notification_type, sent_for_date, sent_at, rental:rentals!inner(user:users!inner(name, email), book:books!inner(title))",
    )
    .gte("sent_for_date", earliest)
    .order("sent_at", { ascending: false });

  const rows: Row[] = (data as Row[] | null) ?? [];

  const today = todayKstISODate();
  const yesterday = lastNKstDates(2)[1];
  const last7 = new Set(lastNKstDates(7));

  // KPI 카운트
  let todayCount = 0;
  let yesterdayCount = 0;
  let weekCount = 0;
  const typeCountToday: Record<NotificationType, number> = {
    due_2: 0, due_1: 0, due_0: 0, overdue: 0,
  };
  for (const r of rows) {
    if (r.sent_for_date === today) {
      todayCount++;
      typeCountToday[r.notification_type]++;
    }
    if (r.sent_for_date === yesterday) yesterdayCount++;
    if (last7.has(r.sent_for_date)) weekCount++;
  }

  // 일별 표 (14일 × 4 타입)
  const daily: Record<
    string,
    Record<NotificationType, number> & { total: number }
  > = {};
  for (const d of dates14)
    daily[d] = { due_2: 0, due_1: 0, due_0: 0, overdue: 0, total: 0 };
  for (const r of rows) {
    const bucket = daily[r.sent_for_date];
    if (!bucket) continue;
    bucket[r.notification_type]++;
    bucket.total++;
  }

  const recent = rows.slice(0, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">알림 발송 이력</h1>
        <p className="text-sm text-muted-foreground mt-1">
          매일 09:00 KST cron 이 발송한 대출 만료/연체 알림 메일 이력입니다.
        </p>
      </div>

      {error ? (
        <div className="p-4 bg-destructive-bg text-destructive rounded-md text-sm">
          데이터 조회 실패: {error.message}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="오늘 발송" value={todayCount} variant="accent" />
            <KpiCard label="어제" value={yesterdayCount} />
            <KpiCard label="최근 7일 합계" value={weekCount} />
            <KpiCard
              label="오늘 타입별"
              value={
                `D-2 ${typeCountToday.due_2} · D-1 ${typeCountToday.due_1} · D-0 ${typeCountToday.due_0} · 연체 ${typeCountToday.overdue}`
              }
            />
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">일별 (최근 14일)</h2>
            <div className="bg-card border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">날짜 (KST)</th>
                    <th className="text-right px-4 py-2 w-20">D-2</th>
                    <th className="text-right px-4 py-2 w-20">D-1</th>
                    <th className="text-right px-4 py-2 w-20">D-0</th>
                    <th className="text-right px-4 py-2 w-20">연체</th>
                    <th className="text-right px-4 py-2 w-20">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {dates14.map((d) => {
                    const b = daily[d];
                    const isToday = d === today;
                    return (
                      <tr key={d} className={isToday ? "bg-muted/30" : ""}>
                        <td className="px-4 py-2 font-mono tabular">
                          {d}
                          {isToday && (
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              오늘
                            </span>
                          )}
                        </td>
                        <td className="text-right px-4 py-2 font-mono tabular">
                          {b.due_2 || ""}
                        </td>
                        <td className="text-right px-4 py-2 font-mono tabular">
                          {b.due_1 || ""}
                        </td>
                        <td className="text-right px-4 py-2 font-mono tabular">
                          {b.due_0 || ""}
                        </td>
                        <td className="text-right px-4 py-2 font-mono tabular">
                          {b.overdue || ""}
                        </td>
                        <td className="text-right px-4 py-2 font-mono tabular font-semibold">
                          {b.total || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              최근 발송 상세 (최신 {recent.length}건)
            </h2>
            <div className="bg-card border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 w-44">발송 시각 (KST)</th>
                    <th className="text-left px-4 py-2 w-20">타입</th>
                    <th className="text-left px-4 py-2">수신자</th>
                    <th className="text-left px-4 py-2">책 제목</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-10 text-muted-foreground"
                      >
                        발송 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    recent.map((r) => {
                      const rental = pick(r.rental);
                      const user = pick(rental?.user ?? null);
                      const book = pick(rental?.book ?? null);
                      return (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-4 py-2 font-mono tabular text-xs">
                            {formatKstDateTime(r.sent_at)}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-sm font-mono text-[11px] ${TYPE_BADGE[r.notification_type]}`}
                            >
                              {TYPE_LABELS[r.notification_type]}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium leading-tight">
                              {user?.name ?? "-"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user?.email ?? "-"}
                            </div>
                          </td>
                          <td className="px-4 py-2">{book?.title ?? "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
