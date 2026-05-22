"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, Bookmark, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

// 모바일 하단 탭바.
//   - 우리 도메인 (별도 /search, /profile 페이지 없음)에 맞춰 3개 탭으로 축소.
//   - 로그인 여부에 따라 마지막 탭이 "로그인" 링크 또는 "로그아웃" 액션 버튼.
//   - sticky bottom + iOS safe-area 패딩 적용.
export function MobileBottomNav({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isBrowse = pathname === "/";
  const isMy = pathname.startsWith("/my");

  async function onLogout() {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  const baseTabClass =
    "flex-1 flex flex-col items-center justify-center text-[11px] leading-tight pt-1";
  const iconWrap =
    "block w-7 h-7 flex items-center justify-center rounded-md mb-0.5";

  return (
    <nav
      className="sticky bottom-0 z-30 bg-paper border-t border-line flex md:hidden"
      style={{
        paddingTop: 10,
        paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        paddingLeft: 6,
        paddingRight: 6,
      }}
    >
      <Link href="/" className={baseTabClass} aria-current={isBrowse ? "page" : undefined}>
        <span
          className={cn(
            iconWrap,
            isBrowse ? "bg-line-soft text-ink" : "text-ink-muted",
          )}
        >
          <BookOpen size={16} strokeWidth={2} />
        </span>
        <span
          className={isBrowse ? "text-ink font-bold" : "text-ink-muted font-medium"}
        >
          둘러보기
        </span>
      </Link>

      <Link
        href="/my/rentals"
        className={baseTabClass}
        aria-current={isMy ? "page" : undefined}
      >
        <span
          className={cn(
            iconWrap,
            isMy ? "bg-line-soft text-ink" : "text-ink-muted",
          )}
        >
          <Bookmark size={16} strokeWidth={2} />
        </span>
        <span className={isMy ? "text-ink font-bold" : "text-ink-muted font-medium"}>
          내 책장
        </span>
      </Link>

      {loggedIn ? (
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          className={cn(baseTabClass, "disabled:opacity-50")}
        >
          <span className={cn(iconWrap, "text-ink-muted")}>
            <LogOut size={16} strokeWidth={2} />
          </span>
          <span className="text-ink-muted font-medium">로그아웃</span>
        </button>
      ) : (
        <Link
          href="/login"
          className={baseTabClass}
          aria-current={pathname === "/login" ? "page" : undefined}
        >
          <span
            className={cn(
              iconWrap,
              pathname === "/login" ? "bg-line-soft text-ink" : "text-ink-muted",
            )}
          >
            <LogIn size={16} strokeWidth={2} />
          </span>
          <span
            className={
              pathname === "/login"
                ? "text-ink font-bold"
                : "text-ink-muted font-medium"
            }
          >
            로그인
          </span>
        </Link>
      )}
    </nav>
  );
}
