"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { daysOverdueKst } from "@/lib/rental-due";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SortCol =
  | "pending" // 반납 신청 우선 (기본) — 헤더에는 없는 진입 기본 정렬
  | "title"
  | "author"
  | "publisher"
  | "user"
  | "rented"
  | "due"
  | "status";

type RentalRow = {
  id: string;
  status: "active" | "overdue" | "returned";
  rented_at: string;
  due_date: string;
  return_requested_at: string | null;
  book: { id: string; title: string; author: string; publisher: string } | null;
  user: { id: string; name: string; employee_no: string; department: string } | null;
};

function statusBadge(s: RentalRow["status"]) {
  if (s === "overdue") return <span className="badge-overdue">연체</span>;
  if (s === "returned") return <span className="badge-returned">반납완료</span>;
  return <span className="badge-active">대출중</span>;
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
  const [searchQ, setSearchQ] = useState("");
  // 기본 정렬: 반납 신청 들어온 건을 최상단(그 안에서 반납기한 이른 순).
  // 사용자가 컬럼 헤더를 누르면 해당 컬럼 정렬로 전환된다.
  const [sortCol, setSortCol] = useState<SortCol>("pending");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function sortIcon(col: SortCol) {
    if (col !== sortCol)
      return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  }

  const displayed = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const filtered = !q
      ? rentals
      : rentals.filter(
          (r) =>
            (r.book?.title ?? "").toLowerCase().includes(q) ||
            (r.book?.author ?? "").toLowerCase().includes(q) ||
            (r.book?.publisher ?? "").toLowerCase().includes(q) ||
            (r.user?.name ?? "").toLowerCase().includes(q),
        );
    // 기본 진입 정렬: 반납 신청 건 최상단 → 그 안에서 반납기한 이른 순
    if (sortCol === "pending") {
      return [...filtered].sort((a, b) => {
        const ar = a.return_requested_at ? 0 : 1;
        const br = b.return_requested_at ? 0 : 1;
        if (ar !== br) return ar - br;
        return a.due_date.localeCompare(b.due_date);
      });
    }
    const getKey = (r: RentalRow): string => {
      switch (sortCol) {
        case "title":
          return r.book?.title ?? "";
        case "author":
          return r.book?.author ?? "";
        case "publisher":
          return r.book?.publisher ?? "";
        case "user":
          return r.user?.name ?? "";
        case "rented":
          return r.rented_at;
        case "due":
          return r.due_date;
        case "status":
          return r.status;
        default:
          return "";
      }
    };
    const sorted = [...filtered].sort((a, b) => {
      const cmp = getKey(a).localeCompare(getKey(b), "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rentals, searchQ, sortCol, sortDir]);

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
        해당하는 대출 record가 없습니다.
      </div>
    );
  }

  const previewOverdue =
    target && new Date(target.due_date) < new Date();

  const headerBtn = "inline-flex items-center hover:text-foreground transition-colors";

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Input
          type="search"
          placeholder="제목 또는 대출자 검색"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {displayed.length} / {rentals.length}
          {searchQ && " (검색)"}
        </span>
      </div>

      <div className="bg-card border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className={headerBtn}
                >
                  제목{sortIcon("title")}
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  type="button"
                  onClick={() => toggleSort("author")}
                  className={headerBtn}
                >
                  저자{sortIcon("author")}
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  type="button"
                  onClick={() => toggleSort("publisher")}
                  className={headerBtn}
                >
                  출판사{sortIcon("publisher")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("user")}
                  className={headerBtn}
                >
                  대출자{sortIcon("user")}
                </button>
              </TableHead>
              <TableHead className="w-28 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort("rented")}
                  className={headerBtn}
                >
                  대출일{sortIcon("rented")}
                </button>
              </TableHead>
              <TableHead className="w-28 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort("due")}
                  className={headerBtn}
                >
                  반납기한{sortIcon("due")}
                </button>
              </TableHead>
              {showOverdueDays && (
                <TableHead className="w-20 text-right whitespace-nowrap">
                  연체일
                </TableHead>
              )}
              <TableHead className="w-24">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className={headerBtn}
                >
                  상태{sortIcon("status")}
                </button>
              </TableHead>
              <TableHead className="w-20 text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showOverdueDays ? 9 : 8}
                  className="text-center py-10 text-muted-foreground text-sm"
                >
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {displayed.map((r) => (
              <TableRow
                key={r.id}
                className={r.return_requested_at ? "bg-primary/5" : undefined}
              >
                <TableCell className="font-medium">
                  {r.book?.title ?? "(삭제됨)"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.book?.author ?? ""}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.book?.publisher ?? ""}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.user?.name ?? "(삭제됨)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.user?.department} · {r.user?.employee_no}
                  </div>
                </TableCell>
                <TableCell className="font-mono tabular text-xs whitespace-nowrap">
                  {fmtDate(r.rented_at)}
                </TableCell>
                <TableCell className="font-mono tabular text-xs whitespace-nowrap">
                  {fmtDate(r.due_date)}
                </TableCell>
                {showOverdueDays && (
                  <TableCell className="text-right font-mono tabular text-destructive whitespace-nowrap">
                    D+{daysOverdueKst(r.due_date)}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    {statusBadge(r.status)}
                    {r.return_requested_at && (
                      <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">
                        반납 요청
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={r.return_requested_at ? "default" : "outline"}
                    onClick={() => openDialog(r)}
                  >
                    {r.return_requested_at ? "반납 확인" : "반납"}
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
                  <span className="text-muted-foreground">대출자: </span>
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
