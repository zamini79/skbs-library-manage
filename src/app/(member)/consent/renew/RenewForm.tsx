"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PrivacyConsentTerms } from "@/components/member/PrivacyConsentTerms";

export function RenewForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주세요.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("users")
        .update({ consent_given_at: new Date().toISOString() })
        .eq("id", userId);
      if (updErr) {
        setError(`재동의 처리 실패: ${updErr.message}`);
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

      {error && (
        <div className="text-sm text-busy bg-busy-soft border border-busy-border px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || !agreed}>
        {loading ? "처리 중..." : "재동의 완료"}
      </Button>
    </form>
  );
}
