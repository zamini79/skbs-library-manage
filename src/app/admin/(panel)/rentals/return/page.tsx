// 반납 처리 — 활성 + 연체 대여 모두 조회
import { requireAny } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { RentalReturnTable } from "@/components/admin/RentalReturnTable";

export default async function AdminRentalsReturnPage() {
  await requireAny();
  const supabase = createClient();

  const { data: rentals, error } = await supabase
    .from("rentals")
    .select(
      `
      id, status, rented_at, due_date,
      book:books!book_id (id, title, author),
      user:users!user_id (id, name, employee_no, department)
    `,
    )
    .in("status", ["active", "overdue"])
    .order("due_date", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">반납 처리</h1>
        <p className="text-md text-muted-foreground mt-1">
          현재 대여 중 또는 연체 상태인 도서{" "}
          <span className="font-mono font-medium text-foreground">
            {rentals?.length ?? 0}
          </span>
          건 — 반납 기한이 이른 순으로 정렬.
        </p>
      </header>

      {error ? (
        <div className="p-4 bg-destructive-bg text-destructive rounded-md">
          조회 오류: {error.message}
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <RentalReturnTable rentals={(rentals as any) ?? []} />
      )}
    </div>
  );
}
