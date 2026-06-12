"use client";
// 회원가입 2단계 — 메일로 받은 6자리 코드 검증 → 세션 생성 → 프로필 작성으로 이동.
// 복사 위치: src/app/signup/verify/page.tsx
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUTH_CONFIG } from "@/lib/auth-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function VerifyForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError("이메일 정보가 없습니다. 가입 페이지에서 다시 시작해주세요.");
      return;
    }
    const clean = token.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(clean)) {
      setError("숫자 인증 코드를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: clean,
        type: "email",
      });
      if (verifyErr) {
        setError(
          /expired|invalid/.test(verifyErr.message)
            ? "코드가 유효하지 않거나 만료되었습니다. 코드를 다시 받아주세요."
            : verifyErr.message,
        );
        return;
      }
      router.replace(AUTH_CONFIG.routes.complete);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: e } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (e) setError(e.message);
      else setInfo("새 인증 코드를 발송했습니다. 메일을 확인해주세요.");
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
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
      {info && (
        <div className="text-sm border rounded-md px-3 py-2">{info}</div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "확인 중..." : "확인"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onResend} disabled={loading || !email}>
        코드 다시 받기
      </Button>
    </form>
  );
}

export default function SignupVerifyPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">이메일 인증</h1>
        <p className="text-sm text-muted-foreground">
          발송된 인증 코드를 입력해주세요.
        </p>
      </header>
      <div className="border rounded-md p-6 space-y-4">
        <Suspense fallback={null}>
          <VerifyForm />
        </Suspense>
        <p className="text-xs text-muted-foreground text-center">
          이메일을 잘못 입력하셨나요?{" "}
          <Link href={AUTH_CONFIG.routes.signup} className="underline">
            다시 입력
          </Link>
        </p>
      </div>
    </div>
  );
}
