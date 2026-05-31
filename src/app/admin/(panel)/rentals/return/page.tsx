// 반납 처리 — 활성 + 연체 대출 모두 조회
import { requireAny } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RentalReturnTable } from "@/components/admin/RentalReturnTable";

export const dynamic = "force-dynamic";

export default async function AdminRentalsReturnPage() {
  await requireAny();
  // 관리자 페이지 — service_role 로 RLS 우회 (admin 인증은 별도 admin_session 쿠키 기반)
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
    .in("status", ["active", "overdue"])
    // 반납 요청된 건을 먼저, 그 다음 반납기한 빠른 순
    .order("return_requested_at", { ascending: false, nullsFirst: false })
    .order("due_date", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">대출 목록</h1>
        <p className="text-md text-muted-foreground mt-1">
          현재 대출 중 또는 연체 상태인 도서{" "}
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
