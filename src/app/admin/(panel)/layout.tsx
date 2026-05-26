import { requireAny } from "@/lib/auth/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAny();

  return (
    <AdminShell
      admin={{ name: admin.name, role: admin.role, loginId: admin.loginId }}
    >
      {children}
    </AdminShell>
  );
}
