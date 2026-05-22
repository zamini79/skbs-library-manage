"use client";

import Link from "next/link";
import { Search, User } from "lucide-react";

// 모바일 상단 바 — 50px, sticky.
// 좌측: SK Bio책장 로고 (font-serif, 책장 부분 accent 색)
// 우측: 검색·프로필 아이콘. 검색 아이콘은 /(메인 hero 검색)으로,
// 프로필 아이콘은 로그인 여부에 따라 /login 또는 /my/rentals 로.
export function MobileTopBar({ loggedIn }: { loggedIn: boolean }) {
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
          <Link
            href="/"
            aria-label="검색"
            className="hover:text-ink transition-colors"
          >
            <Search size={18} strokeWidth={2} />
          </Link>
          <Link
            href={loggedIn ? "/my/rentals" : "/login"}
            aria-label={loggedIn ? "내 책장" : "로그인"}
            className="hover:text-ink transition-colors"
          >
            <User size={18} strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
