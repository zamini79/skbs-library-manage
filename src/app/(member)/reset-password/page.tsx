"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RENTAL_POLICY } from "@/lib/policies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ResetRequestForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith(RENTAL_POLICY.EMAIL_DOMAIN)) {
      setError(`회사 이메일(${RENTAL_POLICY.EMAIL_DOMAIN})만 사용할 수 있습니다.`);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        normalized,
        {
          redirectTo: `${window.location.origin}/reset-password/update`,
        },
      );
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "재설정 메일 발송 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="text-sm bg-ok-soft border border-ok-border text-ok px-3 py-3 rounded-md space-y-1">
          <div className="font-semibold">재설정 메일을 발송했습니다.</div>
          <div className="text-xs text-ink-soft">
            <span className="font-mono">{email}</span> 으로 도착한 메일의 링크를
            클릭하여 새 비밀번호를 설정해주세요. 메일이 보이지 않으면 스팸함도
            확인해주세요.
          </div>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-library-accent hover:underline"
        >
          로그인 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">가입한 이메일</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`name${RENTAL_POLICY.EMAIL_DOMAIN}`}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "발송 중..." : "재설정 메일 받기"}
      </Button>

      <p className="text-xs text-ink-muted text-center">
        <Link href="/login" className="text-library-accent hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          비밀번호 재설정
        </h1>
        <p className="text-sm text-ink-soft">
          가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
        </p>
      </header>

      <div className="bg-paper border border-line rounded-md p-6">
        <Suspense fallback={null}>
          <ResetRequestForm />
        </Suspense>
      </div>
    </div>
  );
}
