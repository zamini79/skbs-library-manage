"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function BookSortFilter({
  current,
  dir,
}: {
  current: "title" | "author";
  dir: "asc" | "desc";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setField(v: string) {
    const params = new URLSearchParams(searchParams);
    if (v && v !== "title") params.set("sort", v);
    else params.delete("sort");
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
    router.refresh();
  }

  function toggleDir() {
    const params = new URLSearchParams(searchParams);
    const next = dir === "asc" ? "desc" : "asc";
    if (next === "desc") params.set("dir", "desc");
    else params.delete("dir");
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-muted">정렬</span>
      <Select value={current} onValueChange={setField}>
        <SelectTrigger className="w-28 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="title">제목순</SelectItem>
          <SelectItem value="author">저자순</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleDir}
        title={dir === "asc" ? "오름차순 (클릭하면 내림차순)" : "내림차순 (클릭하면 오름차순)"}
        aria-label={
          dir === "asc"
            ? "현재 오름차순, 클릭하면 내림차순"
            : "현재 내림차순, 클릭하면 오름차순"
        }
        className="h-8 px-2 font-mono text-base"
      >
        {dir === "asc" ? "↑" : "↓"}
      </Button>
    </div>
  );
}
