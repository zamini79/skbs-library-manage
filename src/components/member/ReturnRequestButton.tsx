"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ReturnRequestButton({
  rentalId,
  bookTitle,
  requested = false,
}: {
  rentalId: string;
  bookTitle: string;
  requested?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/request-return`, {
        method: requested ? "DELETE" : "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        const map: Record<string, string> = {
          ALREADY_REQUESTED: "이미 반납 요청된 대출입니다.",
          NOT_REQUESTED: "취소할 반납 요청이 없습니다.",
          ALREADY_PROCESSED: "이미 처리된 대출입니다.",
        };
        setError(
          map[json?.error] ||
            json?.error ||
            (requested ? "취소 처리에 실패했습니다." : "요청 처리에 실패했습니다."),
        );
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (requested) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="h-7 px-2 inline-flex items-center justify-center rounded-md border border-busy text-busy text-[11px] font-semibold hover:bg-busy-soft transition-colors whitespace-nowrap"
        >
          반납 취소
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>반납 요청 취소</DialogTitle>
              <DialogDescription className="pt-2">
                &quot;{bookTitle}&quot;의 반납 요청을 취소하시겠습니까? 다시
                대출 중 상태로 돌아갑니다.
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
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                돌아가기
              </Button>
              <Button
                variant="destructive"
                onClick={submit}
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-line text-xs font-semibold text-ink hover:bg-line-soft hover:border-ink-soft transition-colors"
      >
        반납
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반납 요청</DialogTitle>
            <DialogDescription className="pt-2">
              &quot;{bookTitle}&quot;을(를) 반납 처리 요청 하시겠습니까?
              관리자가 확인 후 최종 반납이 완료됩니다.
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
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? "요청 중..." : "반납 요청"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
