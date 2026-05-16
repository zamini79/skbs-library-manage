"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/my/rentals"
        className="hover:text-foreground transition-colors text-muted-foreground"
      >
        {name}님
      </Link>
      <button
        type="button"
        onClick={onLogout}
        disabled={loading}
        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "로그아웃"}
      </button>
    </div>
  );
}
