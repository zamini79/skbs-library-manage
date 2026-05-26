"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { TopBar } from "@/components/admin/TopBar";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/policies";

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; role: AdminRole; loginId: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 변경 시 모바일 drawer 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* 모바일 backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden="true"
      />
      <Sidebar role={admin.role} open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          name={admin.name}
          role={admin.role}
          loginId={admin.loginId}
          onMenuClick={() => setOpen(true)}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
