"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
    employee_no: "",
    name: "",
    department: "",
  });
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

      <div className="space-y-2 pt-2 border-t border-line">
        <div className="text-sm font-semibold text-ink">
          개인정보 수집·이용 동의{" "}
          <span className="text-busy text-xs font-normal">(필수)</span>
        </div>
        <div className="border border-line rounded-md bg-paper-warm max-h-56 overflow-y-auto p-4 text-xs leading-relaxed text-ink space-y-3">
          <p className="text-ink-soft">
            SK바이오사이언스 사내 도서관(이하 &quot;도서관&quot;)은 회원 가입 및
            서비스 제공을 위하여 아래와 같이 개인정보를 수집·이용합니다. 내용을
            확인하신 후 동의 여부를 선택하여 주시기 바랍니다.
          </p>

          <div className="space-y-1.5">
            <div className="font-semibold text-ink">수집·이용 내역</div>
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr className="border-b border-line">
                  <th className="text-left align-top py-1.5 pr-2 font-medium w-24 text-ink">
                    수집 목적
                  </th>
                  <td className="py-1.5 text-ink-soft">
                    사내 도서관 회원 등록, 도서 대출·반납 이력 관리, 회원 식별
                    및 본인 확인
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                    수집 항목
                  </th>
                  <td className="py-1.5 text-ink-soft">이름, 사번, 부서명</td>
                </tr>
                <tr className="border-b border-line">
                  <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                    보유·이용 기간
                  </th>
                  <td className="py-1.5 text-ink-soft">
                    동의일로부터 1년 (보유 기간 만료 전 회원 탈퇴 또는 동의
                    철회 시 즉시 파기)
                  </td>
                </tr>
                <tr>
                  <th className="text-left align-top py-1.5 pr-2 font-medium text-ink">
                    파기 방법
                  </th>
                  <td className="py-1.5 text-ink-soft">
                    전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-ink">
              동의 거부 권리 및 불이익 안내
            </div>
            <p className="text-ink-soft">
              귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
              다만, 동의를 거부하실 경우 사내 도서관 회원 가입 및 도서 대출
              서비스 이용이 제한될 수 있습니다.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-ink">개인정보 처리자</div>
            <ul className="text-ink-soft list-disc pl-4 space-y-0.5">
              <li>기관명: SK바이오사이언스 주식회사</li>
              <li>서비스명: SK바이오사이언스 사내 도서관</li>
              <li>문의처: 사내 도서관 담당 부서</li>
            </ul>
          </div>

          <p className="text-[10px] text-ink-muted pt-2 border-t border-line">
            본 약관은 「개인정보 보호법」 제15조 및 제22조에 따라 작성되었습니다.
          </p>
        </div>

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
