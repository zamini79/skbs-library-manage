"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
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
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsed = EmailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      // Supabase signUp는 password가 필수. 임시 랜덤 패스워드 발급, Step 3에서 사용자가 재설정.
      const tempPassword = crypto.randomUUID() + "Aa!1";
      // 인증 메일 confirm 링크가 향하는 origin.
      // 우선순위: NEXT_PUBLIC_SITE_URL (운영 도메인 고정) > window.location.origin (로컬 fallback).
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: signupError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/signup/complete`,
        },
      });
      if (signupError) {
        setError(signupError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-card border rounded-lg p-8 text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-bold">인증 메일을 발송했습니다</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{email}</span> 으로 발송한 메일의 링크를 클릭하면
            <br />
            비밀번호와 사번/부서 입력 화면으로 이동합니다.
          </p>
          <p className="text-xs text-muted-foreground">
            메일이 보이지 않으면 스팸함을 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="text-sm text-muted-foreground">
          회사 이메일({RENTAL_POLICY.EMAIL_DOMAIN})로 가입할 수 있습니다.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 bg-card border rounded-lg p-6">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
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
          <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "발송 중..." : "인증 메일 받기"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
