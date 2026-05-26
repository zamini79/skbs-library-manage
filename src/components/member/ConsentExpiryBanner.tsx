"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "consent-banner-dismissed-day";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ConsentExpiryBanner({ daysLeft }: { daysLeft: number }) {
  const [dismissed, setDismissed] = useState(true); // SSR 깜빡임 방지: 기본 숨김 → 효과에서 노출 결정
  const pathname = usePathname();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === todayKey());
  }, []);

  // 재동의 페이지에서는 노출 불필요
  if (pathname?.startsWith("/consent")) return null;
  if (dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, todayKey());
    setDismissed(true);
  }

  return (
    <div className="bg-busy-soft border-b border-busy-border px-4 py-2 flex items-center justify-between gap-3 text-xs">
      <div className="text-busy">
        <strong>개인정보 보유기간 만료 임박</strong> — {daysLeft}일 후 회원
        정보가 자동 삭제됩니다.{" "}
        <Link
          href="/consent/renew"
          className="underline font-semibold hover:text-ink"
        >
          지금 재동의하기
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="오늘 그만 보기"
        className="text-busy hover:text-ink shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
