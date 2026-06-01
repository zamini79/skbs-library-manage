import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LEGACY_TEMP_PASSWORD } from "@/lib/policies";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/change-password");

  const fromLegacy = searchParams.from === "legacy";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          비밀번호 변경
        </h1>
        <p className="text-sm text-ink-soft">
          {user.email} 계정의 비밀번호를 변경합니다.
        </p>
      </header>

      {fromLegacy && (
        <div className="text-sm bg-busy-soft border border-busy-border text-busy px-3 py-3 rounded-md space-y-1">
          <div className="font-semibold">임시 비밀번호로 로그인되었습니다.</div>
          <div className="text-xs text-ink-soft">
            보안을 위해 지금 바로 비밀번호를 변경해 주세요. 아래{" "}
            <b>현재 비밀번호</b>란에 임시 비밀번호{" "}
            <span className="font-mono text-ink">{LEGACY_TEMP_PASSWORD}</span>를
            입력하고, 새 비밀번호를 설정하시면 됩니다.
          </div>
        </div>
      )}

      <ChangePasswordForm email={user.email ?? ""} />
    </div>
  );
}
