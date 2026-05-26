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
    try {
      const res = await fetch("/api/rental-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const map: Record<string, string> = {
          ALREADY_REQUESTED_BY_OTHER:
            "이미 다른 사용자가 대출을 신청한 도서입니다.",
          ALREADY_REQUESTED_BY_SELF: "이미 신청한 도서입니다.",
          NOT_ELIGIBLE: "현재 대출 자격을 만족하지 않습니다 (월 한도/연체 등 확인).",
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
          setConfirmOpen(true);
        }}
        className={`${sizing} inline-flex items-center justify-center rounded-md bg-ink text-paper hover:opacity-90 transition-opacity`}
      >
        대출 신청
      </button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>대출 신청 확인</DialogTitle>
            <DialogDescription className="pt-2">
              &quot;{bookTitle}&quot;을(를) 대출 신청하시겠습니까? 관리자 승인
              후 대출이 확정됩니다.
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
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={submitRequest} disabled={loading}>
              {loading ? "신청 중..." : "신청"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
