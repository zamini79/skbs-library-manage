"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminRole } from "@/lib/policies";

const ROLE_LABEL: Record<AdminRole, string> = {
  master: "마스터 관리자",
  book: "대여 관리자",
};

export function TopBar({
  name,
  role,
  loginId,
}: {
  name: string;
  role: AdminRole;
  loginId: string;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="h-14 bg-card border-b flex items-center justify-between px-6">
      <div className="text-sm text-muted-foreground">{ROLE_LABEL[role]}</div>
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{name}</span>
        <span className="font-mono text-xs text-muted-foreground">
          ({loginId})
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>
    </header>
  );
}
