import { requireMaster } from "@/lib/auth/admin-auth";
import { BookNewForm } from "@/components/admin/BookNewForm";

export default async function AdminBooksNewPage() {
  await requireMaster();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">신규 입고</h1>
        <p className="text-md text-muted-foreground mt-1">
          도서 한 권을 수동으로 등록합니다.
        </p>
      </header>
      <BookNewForm />
    </div>
  );
}
