"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminRole } from "@/lib/policies";

const ROLE_LABEL: Record<AdminRole, string> = {
  master: "마스터 관리자",
  book: "대출 관리자",
};

export function TopBar({
  name,
  role,
  loginId,
  onMenuClick,
}: {
  name: string;
  role: AdminRole;
  loginId: string;
  onMenuClick?: () => void;
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
    <header className="h-14 bg-card border-b flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden -ml-1 p-2 rounded-md text-foreground hover:bg-muted"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="text-sm text-muted-foreground">{ROLE_LABEL[role]}</div>
      </div>
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
