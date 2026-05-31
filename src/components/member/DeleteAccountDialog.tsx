"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Step = "confirm1" | "confirm2" | "deleting";

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm1");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("confirm1");
    setError(null);
  }

  async function onDelete() {
    setStep("deleting");
    setError(null);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "회원 탈퇴 처리에 실패했습니다.");
        setStep("confirm2");
        return;
      }
      // 세션 정리 + 홈으로 이동
      await fetch("/api/auth/signout", { method: "POST" });
      onOpenChange(false);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setStep("confirm2");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        {step === "confirm1" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-busy" />
                회원 탈퇴 확인
              </DialogTitle>
              <DialogDescription className="pt-2">
                정말 탈퇴하시겠습니까? 탈퇴 시 사내 도서관 회원 정보가
                삭제됩니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setStep("confirm2")}
              >
                다음
              </Button>
            </DialogFooter>
          </>
        )}

        {(step === "confirm2" || step === "deleting") && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-busy" />
                마지막 확인
              </DialogTitle>
              <DialogDescription className="pt-2 space-y-2">
                <span className="block">
                  탈퇴 후에는 회원 정보, 마일리지, 대출 이력 등 모든 정보가
                  복구할 수 없도록 영구 삭제됩니다.
                </span>
                <span className="block font-semibold text-ink">
                  계속 진행하시겠습니까?
                </span>
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("confirm1")}
                disabled={step === "deleting"}
              >
                돌아가기
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={step === "deleting"}
              >
                {step === "deleting" ? "탈퇴 처리 중..." : "탈퇴 확정"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
