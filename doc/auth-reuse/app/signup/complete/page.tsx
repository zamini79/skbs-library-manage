"use client";
// 회원가입 3단계 — 비밀번호 설정 + 프로필 INSERT → 가입 완료.
// profileFields(auth-config) 에 따라 입력란이 자동 생성됩니다.
// 복사 위치: src/app/signup/complete/page.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { AUTH_CONFIG } from "@/lib/auth-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function buildPasswordSchema() {
  const p = AUTH_CONFIG.password;
  let s = z.string().min(p.minLength, `비밀번호는 ${p.minLength}자 이상이어야 합니다.`);
  if (p.requireLetter) s = s.regex(/[A-Za-z]/, "영문자를 1개 이상 포함해야 합니다.");
  if (p.requireNumber) s = s.regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다.");
  if (p.requireSpecial) s = s.regex(/[^A-Za-z0-9]/, "특수문자를 1개 이상 포함해야 합니다.");
  return s;
}

export default function SignupCompletePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 인증된 세션 확인 (verify 단계에서 생성됨)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(AUTH_CONFIG.routes.signup);
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? null);
    });
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const pw = buildPasswordSchema().safeParse(password);
    if (!pw.success) return setError(pw.error.issues[0].message);
    if (password !== confirm) return setError("비밀번호가 일치하지 않습니다.");
    for (const f of AUTH_CONFIG.profileFields) {
      if (f.required && !profile[f.key]?.trim()) return setError(`${f.label}을(를) 입력해주세요.`);
    }
    if (!userId || !email) return setError("세션이 만료되었습니다. 다시 시도해주세요.");

    setLoading(true);
    try {
      const supabase = createClient();
      // 1) 비밀번호 설정
      const { error: updErr } = await supabase.auth.updateUser({ password: pw.data });
      if (updErr) return setError(`비밀번호 설정 실패: ${updErr.message}`);

      // 2) 프로필 INSERT
      const row: Record<string, unknown> = { id: userId, email };
      for (const f of AUTH_CONFIG.profileFields) row[f.key] = profile[f.key] ?? null;
      const { error: insErr } = await supabase.from(AUTH_CONFIG.profileTable).insert(row);
      if (insErr) return setError(`프로필 저장 실패: ${insErr.message}`);

      router.replace(AUTH_CONFIG.routes.afterComplete);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!email) return null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">가입 정보 입력</h1>
        <p className="text-sm text-muted-foreground">
          비밀번호와 정보를 입력하면 가입이 완료됩니다.
        </p>
      </header>
      <form onSubmit={onSubmit} className="space-y-4 border rounded-md p-6">
        <div className="space-y-2">
          <Label>이메일</Label>
          <Input value={email} disabled readOnly />
        </div>

        {AUTH_CONFIG.profileFields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              id={f.key}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              value={profile[f.key] ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
              disabled={loading}
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="pw">비밀번호</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">비밀번호 확인</Label>
          <Input id="pw2" type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} disabled={loading} />
        </div>

        {error && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "처리 중..." : "가입 완료"}
        </Button>
      </form>
    </div>
  );
}
