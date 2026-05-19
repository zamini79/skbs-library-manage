"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(
          data.error === "INVALID_CREDENTIALS"
            ? "로그인 ID 또는 비밀번호가 올바르지 않습니다."
            : "로그인 처리 중 오류가 발생했습니다.",
        );
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login_id">로그인 ID</Label>
        <Input
          id="login_id"
          name="login_id"
          autoComplete="username"
          required
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
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

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-lg shadow-xl p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            SK Bioscience 사내 도서관
          </h1>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            Admin Console
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="text-xs text-muted-foreground text-center">
          관리자 시스템 접속용. 구성원 로그인은{" "}
          <a href="/login" className="text-primary hover:underline">
            여기
          </a>
        </div>
      </div>
    </div>
  );
}
