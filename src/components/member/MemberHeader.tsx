"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/member/UserMenu";
import { cn } from "@/lib/utils";

// 멤버 영역 상단 헤더.
//   - sticky top-0 으로 스크롤 시에도 따라옴.
//   - 페이지 최상단(스크롤 0~8px)에서는 bg-bg 와 같은 톤으로 투명하게 녹아들고,
//     스크롤이 시작되면 bg-paper + border-line 로 살짝 떠올라 navbar 임을 강조.
//   - server 측 (member)/layout.tsx 에서 user/profile 정보를 가져와 name 만 prop 으로 전달.
export function MemberHeader({ name }: { name: string | null }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200",
        scrolled
          ? "bg-paper border-b border-line"
          : "bg-bg border-b border-transparent",
      )}
    >
      <div className="mx-auto w-full max-w-[1720px] px-8 py-2.5 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-base font-bold tracking-tight text-ink hover:text-library-accent transition-colors"
        >
          SK Bioscience ECO Bio 도서관
        </Link>
        {name ? (
          <UserMenu name={name} />
        ) : (
          <nav className="flex gap-4 text-sm text-ink-soft">
            <Link
              href="/login"
              className="hover:text-ink transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="hover:text-ink transition-colors"
            >
              회원가입
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
