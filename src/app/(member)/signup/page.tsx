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
  const [loading, setLoading] = useState(false);

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
      // 6자리 OTP 코드 발송 — magic link 의존성 제거 (디바이스 간 verifier 매칭 이슈 회피).
      // shouldCreateUser: true 로 신규 사용자 자동 생성.
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
          {loading ? "발송 중..." : "인증 코드 받기"}
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
