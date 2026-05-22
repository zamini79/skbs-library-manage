"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 도서 검색 입력 — URL의 ?q= 를 SSR이 읽어 supabase ilike 조회.
// 검색어 변경 시 page=1 로 리셋.
export function BookSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const hasActiveQuery = !!searchParams.get("q");

  function navigate(nextQ: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(q);
  }

  function onClear() {
    setQ("");
    navigate("");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 w-full sm:w-auto sm:max-w-md">
      <Input
        type="search"
        placeholder="제목 또는 저자 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="flex-1 sm:w-72"
      />
      <Button type="submit" variant="outline">
        검색
      </Button>
      {hasActiveQuery && (
        <Button type="button" variant="ghost" onClick={onClear}>
          초기화
        </Button>
      )}
    </form>
  );
}
