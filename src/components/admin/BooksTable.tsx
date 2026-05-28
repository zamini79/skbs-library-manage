"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Database } from "@/types/database.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookEditDialog } from "@/components/admin/BookEditDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Book = Database["public"]["Tables"]["books"]["Row"];

const REASON_OPTIONS = [
  { value: "lost", label: "분실 (lost)" },
  { value: "damaged", label: "훼손 (damaged)" },
  { value: "outdated", label: "노후 (outdated)" },
  { value: "other", label: "기타 (other)" },
] as const;

function statusBadge(book: Pick<Book, "status" | "available_quantity">) {
  if (book.status === "disposed") return <span className="badge-returned">폐기</span>;
  if (book.available_quantity > 0)
    return <span className="badge-available">대여 가능</span>;
  return <span className="badge-active">대여 중</span>;
}

export function BooksTable({ books }: { books: Book[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<string>("lost");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    disposed: number;
    skipped: Array<{ id: string; reason: string }>;
  } | null>(null);

  const eligibleIds = books
    .filter(
      (b) => b.status === "active" && b.available_quantity === b.total_quantity,
    )
    .map((b) => b.id);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === eligibleIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleIds));
    }
  }

  async function onDispose() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/books/dispose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          reason,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        disposed?: number;
        skipped?: Array<{ id: string; reason: string }>;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setResult({ disposed: 0, skipped: [{ id: "", reason: data.error || "unknown" }] });
        return;
      }
      setResult({ disposed: data.disposed ?? 0, skipped: data.skipped ?? [] });
      setSelected(new Set());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selected.size > 0 ? (
            <>선택: <span className="font-mono font-medium text-foreground">{selected.size}</span>권</>
          ) : (
            <>총 <span className="font-mono font-medium text-foreground">{books.length}</span>권 (이 페이지)</>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="whitespace-nowrap"
            disabled={selected.size === 0}
            onClick={() => {
              setResult(null);
              setDialogOpen(true);
            }}
          >
            선택 폐기 처리
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={
                    eligibleIds.length > 0 && selected.size === eligibleIds.length
                  }
                  onChange={toggleAll}
                  disabled={eligibleIds.length === 0}
                />
              </TableHead>
              <TableHead className="min-w-[260px]">제목 / 저자 / 출판사</TableHead>
              <TableHead className="w-28">카테고리</TableHead>
              <TableHead className="w-20 text-right">수량</TableHead>
              <TableHead className="w-24 text-right">가용</TableHead>
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-28 text-right">단가</TableHead>
              <TableHead className="w-20 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              books.map((book) => {
                const canSelect =
                  book.status === "active" &&
                  book.available_quantity === book.total_quantity;
                return (
                  <TableRow key={book.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(book.id)}
                        onChange={() => toggleOne(book.id)}
                        disabled={!canSelect}
                        title={
                          !canSelect
                            ? book.status === "disposed"
                              ? "이미 폐기됨"
                              : "대여 중인 책은 폐기할 수 없습니다"
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/books/${book.id}`}
                        target="_blank"
                        className="hover:text-primary"
                      >
                        <div className="font-medium leading-tight">{book.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {book.author} · {book.publisher}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{book.category}</TableCell>
                    <TableCell className="text-right font-mono tabular">
                      {book.total_quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular">
                      {book.available_quantity}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{statusBadge(book)}</TableCell>
                    <TableCell className="text-right font-mono tabular">
                      {book.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <BookEditDialog book={book} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>도서 폐기 처리</DialogTitle>
            <DialogDescription>
              선택한 <span className="font-mono font-medium">{selected.size}</span>권을 폐기 처리합니다.
              사유를 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">폐기 사유</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result && (
            <div className="text-sm space-y-1">
              <div className="text-success">
                ✓ 폐기 완료: <span className="font-mono">{result.disposed}</span>권
              </div>
              {result.skipped.length > 0 && (
                <div className="text-warning">
                  ⚠ 제외 {result.skipped.length}건: {result.skipped.map((s) => s.reason).join(", ")}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              {result ? "닫기" : "취소"}
            </Button>
            {!result && (
              <Button
                variant="destructive"
                onClick={onDispose}
                disabled={submitting || selected.size === 0}
              >
                {submitting ? "처리 중..." : "폐기 확정"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
