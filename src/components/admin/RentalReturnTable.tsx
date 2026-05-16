"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RentalRow = {
  id: string;
  status: "active" | "overdue" | "returned";
  rented_at: string;
  due_date: string;
  book: { id: string; title: string; author: string } | null;
  user: { id: string; name: string; employee_no: string; department: string } | null;
};

function statusBadge(s: RentalRow["status"]) {
  if (s === "overdue") return <span className="badge-overdue">연체</span>;
  if (s === "returned") return <span className="badge-returned">반납완료</span>;
  return <span className="badge-active">대여중</span>;
}

function daysUntil(due: string): number {
  const ms = new Date(due).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function RentalReturnTable({
  rentals,
  showOverdueDays = false,
}: {
  rentals: RentalRow[];
  showOverdueDays?: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<RentalRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    was_overdue: boolean;
    mileage_delta: number;
  } | null>(null);

  function openDialog(r: RentalRow) {
    setTarget(r);
    setResult(null);
    setError(null);
  }

  async function onConfirm() {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rentals/${target.id}/return`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok: boolean;
        was_overdue?: boolean;
        mileage_delta?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "반납 처리 실패");
        return;
      }
      setResult({
        was_overdue: data.was_overdue ?? false,
        mileage_delta: data.mileage_delta ?? 0,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  if (rentals.length === 0) {
    return (
      <div className="bg-muted rounded-md p-12 text-center text-sm text-muted-foreground">
        <div className="text-2xl mb-2">📭</div>
        해당하는 대여 record가 없습니다.
      </div>
    );
  }

  const previewOverdue =
    target && new Date(target.due_date) < new Date();

  return (
    <>
      <div className="bg-card border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">도서</TableHead>
              <TableHead>대여자</TableHead>
              <TableHead className="w-28">대여일</TableHead>
              <TableHead className="w-28">반납기한</TableHead>
              {showOverdueDays && (
                <TableHead className="w-20 text-right">연체일</TableHead>
              )}
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-20 text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentals.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.book?.title ?? "(삭제됨)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.book?.author}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.user?.name ?? "(삭제됨)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.user?.department} · {r.user?.employee_no}
                  </div>
                </TableCell>
                <TableCell className="font-mono tabular text-xs">
                  {fmtDate(r.rented_at)}
                </TableCell>
                <TableCell className="font-mono tabular text-xs">
                  {fmtDate(r.due_date)}
                </TableCell>
                {showOverdueDays && (
                  <TableCell className="text-right font-mono tabular text-destructive">
                    D+{Math.abs(daysUntil(r.due_date))}
                  </TableCell>
                )}
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => openDialog(r)}>
                    반납
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반납 처리</DialogTitle>
            <DialogDescription>
              아래 정보로 반납을 처리합니다. 마일리지는 DB 트리거가 자동 적립합니다.
            </DialogDescription>
          </DialogHeader>

          {target && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted rounded-md p-3 space-y-1">
                <div>
                  <span className="text-muted-foreground">도서: </span>
                  <span className="font-medium">{target.book?.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">대여자: </span>
                  <span className="font-medium">{target.user?.name}</span>
                  <span className="text-muted-foreground"> ({target.user?.employee_no})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">반납기한: </span>
                  <span className="font-mono">{fmtDate(target.due_date)}</span>
                </div>
              </div>

              {!result && (
                <div
                  className={`p-3 rounded-md ${
                    previewOverdue
                      ? "bg-destructive-bg text-destructive"
                      : "bg-success-bg text-success"
                  }`}
                >
                  <div className="font-medium">
                    {previewOverdue ? "⚠ 연체 반납" : "✓ 정상 반납"}
                  </div>
                  <div className="text-xs mt-1">
                    예상 마일리지 변동:{" "}
                    <span className="font-mono">
                      {previewOverdue ? "-5" : "+10"}점
                    </span>
                  </div>
                </div>
              )}

              {result && (
                <div className="p-3 rounded-md bg-success-bg text-success space-y-1">
                  <div className="font-medium">✓ 반납 완료</div>
                  <div className="text-xs">
                    {result.was_overdue ? "연체 반납" : "정상 반납"} · 마일리지{" "}
                    <span className="font-mono">
                      {result.mileage_delta > 0 ? `+${result.mileage_delta}` : result.mileage_delta}
                    </span>
                    점 적립됨
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-destructive-bg text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={submitting}
            >
              {result ? "닫기" : "취소"}
            </Button>
            {!result && (
              <Button onClick={onConfirm} disabled={submitting}>
                {submitting ? "처리 중..." : "반납 확정"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
