"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BOOK_CATEGORIES } from "@/lib/policies";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "전체 상태" },
  { value: "available", label: "대여 가능" },
  { value: "rented", label: "대여 중" },
  { value: "disposed", label: "폐기" },
];

export function BookFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const category = searchParams.get("category") || "all";
  const status = searchParams.get("status") || "all";

  // q 디바운스 (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      if (next !== searchParams.toString()) {
        router.replace(`?${next}`);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="제목·저자·출판사 검색"
        value={q}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        className="w-72"
      />
      <Select
        value={category}
        onValueChange={(v) => setParam("category", v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 카테고리</SelectItem>
          {BOOK_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
