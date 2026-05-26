"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/safe-redirect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"), "/");
  const reason = searchParams.get("reason");
  const reset = searchParams.get("reset");
  const prefillEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletedNotice, setDeletedNotice] = useState<boolean>(
    reason === "consent_expired",
  );
  const [resetNotice, setResetNotice] = useState<boolean>(reset === "ok");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDeletedNotice(false);
    setResetNotice(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signinErr) {
        if (signinErr.message === "Invalid login credentials") {
          // 동의 만료로 삭제된 이메일인지 tombstone 확인
          try {
            const res = await fetch("/api/consent/check-deleted", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const json = await res.json();
            if (json?.deleted) {
              setDeletedNotice(true);
              return;
            }
          } catch {
            // tombstone 확인 실패 시 일반 에러 메시지로 폴백
          }
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError(signinErr.message);
        }
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
      {resetNotice && (
        <div className="text-sm bg-ok-soft border border-ok-border text-ok px-3 py-2 rounded-md">
          비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
        </div>
      )}

      {deletedNotice && (
        <div className="text-sm bg-busy-soft border border-busy-border text-busy px-3 py-2 rounded-md space-y-1">
          <div className="font-semibold">
            개인정보 보유 기간이 만료되어 회원 정보가 삭제되었습니다.
          </div>
          <div className="text-xs text-ink-soft">
            서비스를 계속 이용하시려면 재가입과 함께 개인정보 수집·이용에 다시
            동의해주세요.{" "}
            <Link
              href="/signup"
              className="text-library-accent underline font-medium"
            >
              회원가입 페이지로 이동
            </Link>
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">비밀번호</Label>
          <Link
            href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="text-xs text-library-accent hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>
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
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
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
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          로그인
        </h1>
        <p className="text-sm text-ink-soft">
          가입하신 이메일과 비밀번호로 로그인하세요.
        </p>
      </header>

      <div className="bg-paper border border-line rounded-md p-6 space-y-4">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-ink-muted text-center">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-library-accent hover:underline">
            회원가입
          </Link>
        </p>
        <p className="text-xs text-ink-muted text-center">
          관리자이신가요?{" "}
          <Link
            href="/admin/login"
            className="text-library-accent hover:underline"
          >
            관리자 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
