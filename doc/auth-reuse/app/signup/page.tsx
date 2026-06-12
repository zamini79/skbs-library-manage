"use client";
// 회원가입 1단계 — 이메일 입력 → 중복 확인 → OTP 코드 메일 발송.
// 복사 위치: src/app/signup/page.tsx (또는 (auth)/signup)
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { AUTH_CONFIG, isAllowedEmail } from "@/lib/auth-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EmailSchema = z.object({
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다.")
    .refine(
      isAllowedEmail,
      AUTH_CONFIG.allowedEmailDomain
        ? `${AUTH_CONFIG.allowedEmailDomain} 이메일만 가입 가능합니다.`
        : "",
    ),
});

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);
    setLoading(true);

    const parsed = EmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      // 1) 이미 가입된 이메일인지 확인
      const res = await fetch("/api/auth/check-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const json = await res.json();
      if (json?.exists) {
        setAlreadyRegistered(true);
        return;
      }

      // 2) OTP 코드 메일 발송 (shouldCreateUser: 신규 auth.users 자동 생성)
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
        `${AUTH_CONFIG.routes.verify}?email=${encodeURIComponent(parsed.data.email)}`,
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
        <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="text-sm text-muted-foreground">
          이메일로 인증 코드를 보내 가입합니다.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 border rounded-md p-6">
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
            disabled={loading}
          />
        </div>

        {alreadyRegistered && (
          <div className="text-sm border rounded-md px-3 py-2">
            이미 가입된 이메일입니다.{" "}
            <Link
              href={`${AUTH_CONFIG.routes.login}?email=${encodeURIComponent(email)}`}
              className="underline font-medium"
            >
              로그인하기
            </Link>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || alreadyRegistered}>
          {loading ? "확인 중..." : "인증 코드 받기"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          이미 계정이 있으신가요?{" "}
          <Link href={AUTH_CONFIG.routes.login} className="underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
