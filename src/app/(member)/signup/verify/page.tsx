"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResendInfo(null);

    if (!email) {
      setError("이메일 정보가 없습니다. 회원가입 페이지로 돌아가서 다시 시작해주세요.");
      return;
    }
    const cleanToken = token.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(cleanToken)) {
      setError("숫자 인증 코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: "email",
      });
      if (verifyErr) {
        setError(
          verifyErr.message.includes("expired") || verifyErr.message.includes("invalid")
            ? "코드가 유효하지 않거나 만료되었습니다. 코드를 다시 받아주세요."
            : verifyErr.message,
        );
        return;
      }
      router.replace("/signup/complete");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setResendInfo(null);
    if (!email) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (resendErr) {
        setError(resendErr.message);
        return;
      }
      setResendInfo("새 인증 코드를 발송했습니다. 메일을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>이메일</Label>
        <Input value={email} disabled readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="token">인증 코드</Label>
        <Input
          id="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          required
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="메일로 받은 숫자 코드"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
          {error}
        </div>
      )}
      {resendInfo && (
        <div className="text-sm text-ok bg-ok-soft border border-ok-border px-3 py-2 rounded-md">
          {resendInfo}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "확인 중..." : "확인"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onResend}
        disabled={loading || !email}
      >
        코드 다시 받기
      </Button>
    </form>
  );
}

export default function SignupVerifyPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          이메일 인증
        </h1>
        <p className="text-sm text-ink-soft">
          입력하신 이메일로 발송된 인증 코드를 입력해주세요.
        </p>
      </header>

      <div className="bg-paper border border-line rounded-md p-6 space-y-4">
        <Suspense fallback={null}>
          <VerifyForm />
        </Suspense>

        <p className="text-xs text-ink-muted text-center">
          이메일을 잘못 입력하셨나요?{" "}
          <Link href="/signup" className="text-library-accent hover:underline">
            다시 입력
          </Link>
        </p>
      </div>
    </div>
  );
}
