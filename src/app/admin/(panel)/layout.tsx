import { requireAny } from "@/lib/auth/admin-auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { TopBar } from "@/components/admin/TopBar";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAny();

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar role={admin.role} />
      <div className="flex-1 flex flex-col">
        <TopBar name={admin.name} role={admin.role} loginId={admin.loginId} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
