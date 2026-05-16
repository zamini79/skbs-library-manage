"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ProfileSchema = z.object({
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
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
    employee_no: "",
    name: "",
    department: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
    <form onSubmit={onSubmit} className="space-y-4 bg-card border rounded-lg p-6">
      <div className="space-y-2">
        <Label>이메일</Label>
        <Input value={email} disabled className="font-mono" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="6자 이상"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="employee_no">사번</Label>
          <Input
            id="employee_no"
            required
            value={form.employee_no}
            onChange={(e) => update("employee_no", e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">부서</Label>
        <Input
          id="department"
          required
          value={form.department}
          onChange={(e) => update("department", e.target.value)}
          placeholder="예: 정보보안팀"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "처리 중..." : "가입 완료"}
      </Button>
    </form>
  );
}
