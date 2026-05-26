"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  BookOpen,
  KeyRound,
  LogOut,
  UserX,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteAccountDialog } from "@/components/member/DeleteAccountDialog";

export function UserMenu({
  name,
  variant = "desktop",
}: {
  name: string;
  variant?: "desktop" | "mobile-icon";
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        {variant === "mobile-icon" ? (
          <DropdownMenuTrigger
            className="text-ink-soft hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            aria-label={`${name}님 메뉴`}
          >
            <User size={18} strokeWidth={2} />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
            aria-label="사용자 메뉴"
          >
            <span>{name}님</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={() => router.push("/my/rentals")}
            className="cursor-pointer"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            나의 책장 보기
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push("/change-password")}
            className="cursor-pointer"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            비밀번호 변경
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onLogout}
            disabled={loggingOut}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? "로그아웃 중..." : "로그아웃"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
            className="cursor-pointer text-busy focus:text-busy"
          >
            <UserX className="mr-2 h-4 w-4" />
            회원 탈퇴
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
