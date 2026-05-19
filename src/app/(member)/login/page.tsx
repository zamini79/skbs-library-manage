"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signinErr) {
        setError(
          signinErr.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : signinErr.message,
        );
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

export default function MemberLoginPage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
        <p className="text-sm text-muted-foreground">
          가입하신 이메일과 비밀번호로 로그인하세요.
        </p>
      </header>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-muted-foreground text-center">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            회원가입
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          관리자이신가요?{" "}
          <Link href="/admin/login" className="text-primary hover:underline">
            관리자 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
