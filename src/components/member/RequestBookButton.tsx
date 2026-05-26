"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Eligibility = {
  eligible?: boolean;
  book_available?: boolean;
  book_active?: boolean;
  monthly_count?: number;
  monthly_remaining?: number;
  current_holding?: number;
  holding_remaining?: number;
  overdue_count?: number;
  has_overdue?: boolean;
};

function eligibilityReasons(e: Eligibility | null | undefined): string[] {
  if (!e) return [];
  const out: string[] = [];
  if (e.book_active === false) out.push("도서가 폐기·정리되어 대출할 수 없습니다.");
  if (e.book_available === false)
    out.push("이 도서는 현재 대출 중이거나 가용 수량이 없습니다.");
  if (typeof e.monthly_remaining === "number" && e.monthly_remaining <= 0)
    out.push(
      `이번 달 대출 한도(2회)를 모두 사용했습니다 (현재 ${e.monthly_count ?? 0}/2회). 다음 달 1일에 초기화됩니다.`,
    );
  if (typeof e.holding_remaining === "number" && e.holding_remaining <= 0)
    out.push(
      `동시에 보유할 수 있는 도서(2권)를 모두 대출 중입니다 (현재 ${e.current_holding ?? 0}/2권). 먼저 반납해주세요.`,
    );
  if (e.has_overdue)
    out.push(
      `연체된 대출이 있습니다 (${e.overdue_count ?? 0}건). 반납 후 다시 시도해주세요.`,
    );
  return out;
}

type Variant = "desktop" | "mobile";

export function RequestBookButton({
  bookId,
  bookTitle,
  state,
  myPendingRequestId,
  variant = "desktop",
}: {
  bookId: string;
  bookTitle: string;
  state:
    | "not-authed"
    | "available"
    | "requested-by-self"
    | "requested-by-other"
    | "unavailable";
  myPendingRequestId?: string | null;
  variant?: Variant;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  const sizing =
    variant === "mobile"
      ? "h-9 px-4 text-[12px] font-semibold"
      : "h-10 px-5 text-sm font-semibold";

  if (state === "not-authed") {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(`/books/${bookId}`)}`}
        className={`${sizing} inline-flex items-center justify-center rounded-md bg-ink text-paper hover:opacity-90 transition-opacity`}
      >
        로그인 후 신청
      </Link>
    );
  }

  if (state === "unavailable") {
    return (
      <button
        type="button"
        disabled
        className={`${sizing} inline-flex items-center justify-center rounded-md bg-line text-ink-muted cursor-not-allowed`}
      >
        대출 불가
      </button>
    );
  }

  if (state === "requested-by-other") {
    return (
      <button
        type="button"
        disabled
        className={`${sizing} inline-flex items-center justify-center rounded-md bg-line text-ink-muted cursor-not-allowed`}
      >
        대출 승인 대기중
      </button>
    );
  }

  async function submitRequest() {
    setLoading(true);
    setError(null);
    setReasons([]);
    try {
      const res = await fetch("/api/rental-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json?.error === "NOT_ELIGIBLE") {
          const list = eligibilityReasons(json.eligibility as Eligibility);
          if (list.length > 0) {
            setReasons(list);
            setError(null);
          } else {
            setError("현재 대출 자격을 만족하지 않습니다.");
          }
          return;
        }
        const map: Record<string, string> = {
          ALREADY_REQUESTED_BY_OTHER:
            "이미 다른 사용자가 대출을 신청한 도서입니다.",
          ALREADY_REQUESTED_BY_SELF: "이미 신청한 도서입니다.",
        };
        setError(map[json?.error] || json?.error || "신청 처리에 실패했습니다.");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  async function cancelRequest() {
    if (!myPendingRequestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rental-requests/${myPendingRequestId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json?.error || "취소 처리에 실패했습니다.");
        return;
      }
      setCancelOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  if (state === "requested-by-self") {
    return (
      <>
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className={`${sizing} inline-flex items-center justify-center rounded-md border border-busy text-busy hover:bg-busy-soft transition-colors`}
        >
          신청 취소
        </button>
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>대출 신청 취소</DialogTitle>
              <DialogDescription className="pt-2">
                &quot;{bookTitle}&quot;에 대한 신청을 취소하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelOpen(false)}
                disabled={loading}
              >
                돌아가기
              </Button>
              <Button
                variant="destructive"
                onClick={cancelRequest}
                disabled={loading}
              >
                {loading ? "처리 중..." : "취소 확정"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // state === "available"
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setReasons([]);
          setConfirmOpen(true);
        }}
        className={`${sizing} inline-flex items-center justify-center rounded-md bg-ink text-paper hover:opacity-90 transition-opacity`}
      >
        대출 신청
      </button>
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) {
            setError(null);
            setReasons([]);
          }
          setConfirmOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reasons.length > 0 ? "대출 신청 불가" : "대출 신청 확인"}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {reasons.length > 0
                ? "아래 사유로 지금은 대출을 신청할 수 없습니다."
                : `"${bookTitle}"을(를) 대출 신청하시겠습니까? 관리자 승인 후 대출이 확정됩니다.`}
            </DialogDescription>
          </DialogHeader>
          {reasons.length > 0 && (
            <ul className="text-sm bg-busy-soft border border-busy-border text-busy rounded-md px-3 py-2 space-y-1.5 list-disc list-inside">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {error && (
            <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              {reasons.length > 0 ? "닫기" : "취소"}
            </Button>
            {reasons.length === 0 && (
              <Button onClick={submitRequest} disabled={loading}>
                {loading ? "신청 중..." : "신청"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
