import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/change-password");

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
      <ChangePasswordForm email={user.email ?? ""} />
    </div>
  );
}
