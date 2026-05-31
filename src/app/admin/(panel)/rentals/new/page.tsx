import { requireAny } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RentalNewForm } from "@/components/admin/RentalNewForm";
import {
  PendingRequestsList,
  type PendingRequest,
} from "@/components/admin/PendingRequestsList";

export const dynamic = "force-dynamic";

export default async function AdminRentalsNewPage() {
  await requireAny();

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("rental_requests")
    .select(
      `
      id,
      requested_at,
      book:books ( id, title, author, publisher, category, available_quantity ),
      user:users ( id, name, email, employee_no, department )
    `,
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  const requests: PendingRequest[] = (
    (rows as unknown as PendingRequest[]) ?? []
  ).filter((r) => r.book && r.user);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">대출 등록</h1>
        <p className="text-md text-muted-foreground mt-1">
          사용자가 신청한 대출은 아래 목록에서 승인·반려하거나, 아래에서 직접
          새 대출를 등록할 수 있습니다.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">대기 중인 대출 신청</h2>
          <span className="text-sm text-muted-foreground">
            {requests.length}건
          </span>
        </div>
        <PendingRequestsList requests={requests} />
      </section>

      <section className="space-y-3 pt-2 border-t">
        <h2 className="text-xl font-semibold pt-4">직접 대출 등록</h2>
        <RentalNewForm />
      </section>
    </div>
  );
}
