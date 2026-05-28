"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const PasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(128, "비밀번호는 128자 이하여야 합니다.")
  .regex(/[A-Za-z]/, "영문자를 1개 이상 포함해야 합니다.")
  .regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다.")
  .regex(/[^A-Za-z0-9]/, "특수문자를 1개 이상 포함해야 합니다.");

export default function ResetPasswordUpdatePage() {
  const router = useRouter();
  const [ready, setReady] = useState<"loading" | "ok" | "no-session">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 페이지 진입 직후 supabase-js 가 URL hash 의 recovery 토큰을 파싱하여 세션 생성.
  // 그 후 getUser 로 세션 검증.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
        setReady("ok");
      } else {
        setReady("no-session");
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("두 비밀번호가 일치하지 않습니다.");
      return;
    }
    const parsed = PasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.auth.updateUser({
        password: parsed.data,
      });
      if (updErr) {
        setError(`비밀번호 변경 실패: ${updErr.message}`);
        return;
      }
      // 레거시 이관 계정 플래그 클리어 (signOut 전, 세션 살아있을 때)
      await fetch("/api/auth/clear-pwd-flag", { method: "POST" });
      // 즉시 로그인 페이지로 이동 (새 비밀번호로 다시 로그인)
      await supabase.auth.signOut();
      router.replace("/login?reset=ok");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          새 비밀번호 설정
        </h1>
        <p className="text-sm text-ink-soft">
          {email
            ? `${email} 계정의 새 비밀번호를 설정해주세요.`
            : "새 비밀번호를 설정해주세요."}
        </p>
      </header>

      <div className="bg-paper border border-line rounded-md p-6">
        {ready === "loading" && (
          <div className="text-sm text-ink-soft">세션 확인 중...</div>
        )}

        {ready === "no-session" && (
          <div className="space-y-4">
            <div className="text-sm bg-busy-soft border border-busy-border text-busy px-3 py-3 rounded-md space-y-1">
              <div className="font-semibold">
                유효한 재설정 세션이 없습니다.
              </div>
              <div className="text-xs text-ink-soft">
                메일 링크가 만료되었거나 이미 사용되었을 수 있습니다. 다시
                요청해주세요.
              </div>
            </div>
            <Link
              href="/reset-password"
              className="block text-center text-sm text-library-accent hover:underline"
            >
              재설정 메일 다시 받기
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="영문·숫자·특수문자 포함 8자 이상"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">새 비밀번호 확인</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
