import { requireAny, adminRoleLabel } from "@/lib/auth/admin-auth";

export default async function AdminDashboardPage() {
  const admin = await requireAny();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-md text-muted-foreground">
          환영합니다, <span className="font-medium">{admin.name}</span>님 (
          {adminRoleLabel(admin.role)})
        </p>
      </header>

      <div className="bg-card border rounded-md p-8 text-center text-muted-foreground">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-md">
          대시보드 KPI/차트는 Day 7에 추가될 예정입니다.
        </div>
      </div>
    </div>
  );
}
