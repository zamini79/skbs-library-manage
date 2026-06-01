// 관리자 — 회원 목록
//
// 가입된 회원 전체 + 각 회원의 현재 대출(active/overdue) 책을 함께 조회한다.
// 모든 관리자(master/book) 열람 가능. service_role 로 RLS 우회.
import { requireAny } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MembersTable, type MemberRow } from "@/components/admin/MembersTable";

export const dynamic = "force-dynamic";

type RentalLite = {
  status: "active" | "overdue" | "returned";
  book: { title: string } | { title: string }[] | null;
};

export default async function AdminMembersPage() {
  await requireAny();
  const supabase = createAdminClient();

  // 회원 + 현재 보유(active/overdue) 대출의 책 제목까지 한 번에 join
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id, name, employee_no, email, department, is_active,
      rentals!user_id ( status, book:books!book_id ( title ) )
      `,
    )
    .order("name", { ascending: true });

  const members: MemberRow[] = ((data as unknown as Array<{
    id: string;
    name: string;
    employee_no: string;
    email: string;
    department: string;
    is_active: boolean;
    rentals: RentalLite[] | null;
  }>) ?? []).map((u) => {
    const held = (u.rentals ?? []).filter(
      (r) => r.status === "active" || r.status === "overdue",
    );
    const books = held.map((r) => {
      const b = Array.isArray(r.book) ? r.book[0] : r.book;
      return { title: b?.title ?? "(삭제됨)", overdue: r.status === "overdue" };
    });
    return {
      id: u.id,
      name: u.name,
      employee_no: u.employee_no,
      email: u.email,
      department: u.department,
      is_active: u.is_active,
      books,
      hasOverdue: books.some((b) => b.overdue),
      holdingCount: books.length,
    };
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">회원 목록</h1>
        <p className="text-md text-muted-foreground mt-1">
          가입한 회원{" "}
          <span className="font-mono font-medium text-foreground">
            {members.length}
          </span>
          명 — 이름·사번·이메일·팀명으로 검색할 수 있습니다.
        </p>
      </header>

      {error ? (
        <div className="p-4 bg-destructive-bg text-destructive rounded-md">
          조회 오류: {error.message}
        </div>
      ) : (
        <MembersTable members={members} />
      )}
    </div>
  );
}
