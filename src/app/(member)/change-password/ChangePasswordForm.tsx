"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LEGACY_TEMP_PASSWORD } from "@/lib/policies";
import { findGuessablePasswordIssue } from "@/lib/password-policy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(128, "비밀번호는 128자 이하여야 합니다.")
  .regex(/[A-Za-z]/, "영문자를 1개 이상 포함해야 합니다.")
  .regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다.")
  .regex(/[^A-Za-z0-9]/, "특수문자를 1개 이상 포함해야 합니다.");

export function ChangePasswordForm({
  email,
  legacy = false,
}: {
  email: string;
  // legacy=true (레거시 임시 비번 로그인): 현재 비밀번호 입력 생략, 임시 비번 자동 사용
  legacy?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(legacy ? LEGACY_TEMP_PASSWORD : "");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }
    if (current === next) {
      setError("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      return;
    }
    const parsed = PasswordSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const guessableIssue = findGuessablePasswordIssue(parsed.data, { email });
    if (guessableIssue) {
      setError(guessableIssue);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // 1) 현재 비밀번호 검증 — 같은 세션 안에서 reauth
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (reauthErr) {
        setError("현재 비밀번호가 일치하지 않습니다.");
        return;
      }
      // 2) 새 비밀번호로 변경
      const { error: updErr } = await supabase.auth.updateUser({
        password: parsed.data,
      });
      if (updErr) {
        setError(`비밀번호 변경 실패: ${updErr.message}`);
        return;
      }
      // 3) 레거시 이관 계정 플래그 클리어 (멤버는 RLS 컬럼 제약으로 직접 못 바꿈 → 서버 경유)
      await fetch("/api/auth/clear-pwd-flag", { method: "POST" });
      // 4) 안전을 위해 재로그인 — 모든 세션 무효화 후 새 비밀번호로 다시
      await fetch("/api/auth/signout", { method: "POST" });
      router.replace("/login?reset=ok");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function pwField(
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void,
    placeholder?: string,
    invalid?: boolean,
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            type={show ? "text" : "password"}
            autoComplete={id === "current" ? "current-password" : "new-password"}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="pr-10"
            aria-invalid={invalid}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
            aria-pressed={show}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 bg-paper border border-line rounded-md p-6"
    >
      {!legacy &&
        pwField(
          "current",
          "현재 비밀번호",
          current,
          setCurrent,
          showCurrent,
          setShowCurrent,
        )}
      {pwField(
        "next",
        "새 비밀번호",
        next,
        setNext,
        showNext,
        setShowNext,
        "영문·숫자·특수문자 포함 8자 이상",
      )}
      {pwField(
        "confirm",
        "새 비밀번호 확인",
        confirm,
        setConfirm,
        showConfirm,
        setShowConfirm,
        "같은 비밀번호를 한 번 더 입력",
        confirm.length > 0 && confirm !== next,
      )}
      {confirm.length > 0 && confirm !== next && (
        <p className="text-xs text-busy">
          새 비밀번호와 확인이 일치하지 않습니다.
        </p>
      )}

      {error && (
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}
