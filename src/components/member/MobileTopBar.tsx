"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { UserMenu } from "@/components/member/UserMenu";

// 모바일 상단 바 — 50px, sticky.
// 좌측: SK Bio책장 로고 (font-serif)
// 우측: 로그인 상태일 때 사용자 메뉴(드롭다운), 비로그인일 때 /login 링크.
export function MobileTopBar({
  loggedIn,
  name,
}: {
  loggedIn: boolean;
  name: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 bg-paper border-b border-line md:hidden">
      <div className="flex items-center justify-between px-[18px] py-[14px]">
        <Link
          href="/"
          className="font-serif text-[16px] font-bold tracking-tight text-ink truncate min-w-0"
        >
          SK Bioscience 사내 도서관
        </Link>
        <nav className="flex items-center gap-[14px] text-ink-soft">
          {loggedIn && name ? (
            <UserMenu name={name} variant="mobile-icon" />
          ) : (
            <Link
              href="/login"
              aria-label="로그인"
              className="hover:text-ink transition-colors"
            >
              <User size={18} strokeWidth={2} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
