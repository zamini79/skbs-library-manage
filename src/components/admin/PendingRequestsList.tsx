"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PendingRequest = {
  id: string;
  requested_at: string;
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    category: string;
    available_quantity: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    employee_no: string;
    department: string;
  };
};

function fmtKR(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendingRequestsList({
  requests,
}: {
  requests: PendingRequest[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rental-requests/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json?.error || "승인 처리 실패");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(target: PendingRequest, reason: string) {
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rental-requests/${target.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json?.error || "반려 처리 실패");
        return;
      }
      setRejectTarget(null);
      setRejectReason("");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-muted rounded-md p-4 text-sm text-muted-foreground text-center">
        현재 처리 대기 중인 대출 신청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-card border rounded-md divide-y">
        {requests.map((r) => (
          <div
            key={r.id}
            className="p-4 grid grid-cols-1 lg:grid-cols-[2fr_2fr_auto] gap-4 items-start"
          >
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {r.book.category}
              </div>
              <div className="font-medium">{r.book.title}</div>
              <div className="text-xs text-muted-foreground">
                {r.book.author} · {r.book.publisher} · 가용{" "}
                {r.book.available_quantity}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="font-medium">
                {r.user.name}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({r.user.department})
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                사번 {r.user.employee_no} · {r.user.email}
              </div>
              <div className="text-xs text-muted-foreground">
                신청: {fmtKR(r.requested_at)}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                onClick={() => approve(r.id)}
                disabled={busyId === r.id}
              >
                {busyId === r.id ? "처리 중..." : "승인"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectTarget(r);
                  setRejectReason("");
                  setError(null);
                }}
                disabled={busyId === r.id}
              >
                반려
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>대출 신청 반려</DialogTitle>
            <DialogDescription className="pt-1">
              {rejectTarget && (
                <>
                  <span className="font-medium">{rejectTarget.book.title}</span>{" "}
                  · {rejectTarget.user.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">반려 사유 (선택)</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="예: 동일 도서 보유중"
              maxLength={500}
              disabled={busyId === rejectTarget?.id}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={busyId === rejectTarget?.id}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectTarget && reject(rejectTarget, rejectReason)}
              disabled={busyId === rejectTarget?.id}
            >
              {busyId === rejectTarget?.id ? "처리 중..." : "반려 확정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
