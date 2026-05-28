// 연체 목록 — status='overdue' 만 (Vercel Cron이 매일 자정 자동 갱신, Day 7)
import { requireAny } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RentalReturnTable } from "@/components/admin/RentalReturnTable";

export const dynamic = "force-dynamic";

export default async function AdminRentalsOverduePage() {
  await requireAny();
  const supabase = createAdminClient();

  const { data: rentals, error } = await supabase
    .from("rentals")
    .select(
      `
      id, status, rented_at, due_date, return_requested_at,
      book:books!book_id (id, title, author, publisher),
      user:users!user_id (id, name, employee_no, department)
    `,
    )
    .eq("status", "overdue")
    .order("due_date", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">연체 목록</h1>
        <p className="text-md text-muted-foreground mt-1">
          연체 상태로 분류된 대여{" "}
          <span className="font-mono font-medium text-foreground">
            {rentals?.length ?? 0}
          </span>
          건.
        </p>
      </header>

      {error ? (
        <div className="p-4 bg-destructive-bg text-destructive rounded-md">
          조회 오류: {error.message}
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <RentalReturnTable rentals={(rentals as any) ?? []} showOverdueDays />
      )}
    </div>
  );
}
