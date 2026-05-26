"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PrivacyConsentTerms } from "@/components/member/PrivacyConsentTerms";

const ProfileSchema = z.object({
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(128, "비밀번호는 128자 이하여야 합니다.")
    .regex(/[A-Za-z]/, "영문자를 1개 이상 포함해야 합니다.")
    .regex(/[0-9]/, "숫자를 1개 이상 포함해야 합니다.")
    .regex(/[^A-Za-z0-9]/, "특수문자를 1개 이상 포함해야 합니다."),
  employee_no: z.string().min(1, "사번을 입력해주세요.").max(50),
  name: z.string().min(1, "이름을 입력해주세요.").max(50),
  department: z.string().min(1, "부서를 입력해주세요.").max(100),
});

export function SignupCompleteForm({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    password: "",
    passwordConfirm: "",
    employee_no: "",
    name: "",
    department: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주세요.");
      setLoading(false);
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("두 비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    const parsed = ProfileSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // 1. 비밀번호 설정
      const { error: updateErr } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateErr) {
        setError(`비밀번호 설정 실패: ${updateErr.message}`);
        return;
      }

      // 2. users 프로필 INSERT (RLS: auth.uid() = id 검증)
      const { error: insertErr } = await supabase.from("users").insert({
        id: userId,
        email,
        employee_no: parsed.data.employee_no,
        name: parsed.data.name,
        department: parsed.data.department,
        consent_given_at: new Date().toISOString(),
      });
      if (insertErr) {
        if (insertErr.code === "23505") {
          setError("이미 등록된 사번 또는 이메일입니다.");
        } else {
          setError(`프로필 생성 실패: ${insertErr.message}`);
        }
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 bg-paper border border-line rounded-md p-6"
    >
      <div className="space-y-2">
        <Label>이메일</Label>
        <Input value={email} disabled className="font-mono" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="영문·숫자·특수문자 포함 8자 이상"
            disabled={loading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "비밀번호 숨기기" : "비밀번호 표시"}
            aria-pressed={showPwd}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password-confirm">비밀번호 확인</Label>
        <div className="relative">
          <Input
            id="password-confirm"
            type={showPwdConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.passwordConfirm}
            onChange={(e) => update("passwordConfirm", e.target.value)}
            placeholder="같은 비밀번호를 한 번 더 입력"
            disabled={loading}
            className="pr-10"
            aria-invalid={
              form.passwordConfirm.length > 0 &&
              form.passwordConfirm !== form.password
            }
          />
          <button
            type="button"
            onClick={() => setShowPwdConfirm((v) => !v)}
            aria-label={
              showPwdConfirm ? "비밀번호 숨기기" : "비밀번호 표시"
            }
            aria-pressed={showPwdConfirm}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
          >
            {showPwdConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {form.passwordConfirm.length > 0 &&
          form.passwordConfirm !== form.password && (
            <p className="text-xs text-busy">
              두 비밀번호가 일치하지 않습니다.
            </p>
          )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="employee_no">
            사번 <span className="text-busy" aria-hidden="true">*</span>
          </Label>
          <Input
            id="employee_no"
            required
            aria-required="true"
            value={form.employee_no}
            onChange={(e) => update("employee_no", e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">
            이름 <span className="text-busy" aria-hidden="true">*</span>
          </Label>
          <Input
            id="name"
            required
            aria-required="true"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">
          부서 <span className="text-busy" aria-hidden="true">*</span>
        </Label>
        <Input
          id="department"
          required
          aria-required="true"
          value={form.department}
          onChange={(e) => update("department", e.target.value)}
          placeholder="예: 정보보안팀"
          disabled={loading}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-line">
        <div className="text-sm font-semibold text-ink">
          개인정보 수집·이용 동의{" "}
          <span className="text-busy text-xs font-normal">(필수)</span>
        </div>
        <PrivacyConsentTerms />

        <label className="flex items-start gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-line cursor-pointer"
          />
          <span className="text-sm text-ink">
            위 개인정보 수집·이용 목적, 항목, 보유기간을 확인하였으며 이에
            동의합니다.
          </span>
        </label>
      </div>

      {error && (
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !agreed}
      >
        {loading ? "처리 중..." : "가입 완료"}
      </Button>
    </form>
  );
}
