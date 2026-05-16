import { requireAny } from "@/lib/auth/admin-auth";
import { RentalNewForm } from "@/components/admin/RentalNewForm";

export default async function AdminRentalsNewPage() {
  await requireAny();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">대여 등록</h1>
        <p className="text-md text-muted-foreground mt-1">
          도서와 대여자를 선택하면 정책 검증 후 대여 처리합니다.
        </p>
      </header>
      <RentalNewForm />
    </div>
  );
}
