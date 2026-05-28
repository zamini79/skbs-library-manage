"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { RENTAL_POLICY } from "@/lib/policies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EmailSchema = z.object({
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다.")
    .refine(
      (v) => v.toLowerCase().endsWith(RENTAL_POLICY.EMAIL_DOMAIN),
      `회사 이메일(${RENTAL_POLICY.EMAIL_DOMAIN})만 가입 가능합니다.`,
    ),
});

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [importedNotice, setImportedNotice] = useState<
    null | { state: "sending" | "sent" | "fail"; message?: string }
  >(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);
    setImportedNotice(null);
    setLoading(true);

    const parsed = EmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      // 1) 가입 여부 사전 체크 — 이미 가입된 이메일이면 OTP 발송 차단
      const res = await fetch("/api/auth/check-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const json = await res.json();
      if (json?.exists) {
        if (json.must_change_password) {
          // 레거시 이관 계정 — Supabase 비밀번호 재설정 메일 발송
          setImportedNotice({ state: "sending" });
          const supabase = createClient();
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
            parsed.data.email,
            { redirectTo: `${window.location.origin}/reset-password/update` },
          );
          if (resetErr) {
            setImportedNotice({ state: "fail", message: resetErr.message });
          } else {
            setImportedNotice({ state: "sent" });
          }
          return;
        }
        setAlreadyRegistered(true);
        return;
      }

      // 2) 6자리 OTP 코드 발송 — magic link 의존성 제거 (디바이스 간 verifier 매칭 이슈 회피).
      // shouldCreateUser: true 로 신규 사용자 자동 생성.
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: { shouldCreateUser: true },
      });
      if (otpErr) {
        setError(otpErr.message);
        return;
      }
      router.push(
        `/signup/verify?email=${encodeURIComponent(parsed.data.email)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          회원가입
        </h1>
        <p className="text-sm text-ink-soft">
          회사 이메일({RENTAL_POLICY.EMAIL_DOMAIN})로 가입할 수 있습니다.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-4 bg-paper border border-line rounded-md p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (alreadyRegistered) setAlreadyRegistered(false);
            }}
            placeholder={`name${RENTAL_POLICY.EMAIL_DOMAIN}`}
            disabled={loading}
          />
        </div>

        {alreadyRegistered && (
          <div className="text-sm bg-busy-soft border border-busy-border text-busy px-3 py-2 rounded-md space-y-1">
            <div className="font-semibold">
              이미 가입된 이메일입니다.
            </div>
            <div className="text-xs text-ink-soft">
              로그인 페이지로 이동하여 로그인해주세요.{" "}
              <Link
                href={`/login?email=${encodeURIComponent(email)}`}
                className="text-library-accent underline font-medium"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          </div>
        )}

        {importedNotice && (
          <div
            className={
              importedNotice.state === "fail"
                ? "text-sm bg-busy-soft border border-busy-border text-busy px-3 py-2 rounded-md space-y-1"
                : "text-sm bg-ok-soft border border-ok-border text-ok px-3 py-2 rounded-md space-y-1"
            }
          >
            <div className="font-semibold">
              {importedNotice.state === "sending" && "비밀번호 재설정 메일 발송 중..."}
              {importedNotice.state === "sent" && "기존 시스템에서 이관된 계정입니다."}
              {importedNotice.state === "fail" && "메일 발송 실패"}
            </div>
            <div className="text-xs text-ink-soft">
              {importedNotice.state === "sent" && (
                <>
                  비밀번호 재설정 메일을{" "}
                  <span className="font-mono">{email}</span>로 발송했습니다.
                  메일의 링크를 클릭하여 새 비밀번호를 설정하신 후 로그인해
                  주세요. (스팸함도 확인)
                </>
              )}
              {importedNotice.state === "fail" && importedNotice.message}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || alreadyRegistered || importedNotice?.state === "sent"}
        >
          {loading ? "확인 중..." : "인증 코드 받기"}
        </Button>

        <p className="text-xs text-ink-muted text-center">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-library-accent hover:underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
