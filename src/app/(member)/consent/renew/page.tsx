import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RenewForm } from "./RenewForm";

export const dynamic = "force-dynamic";

export default async function ConsentRenewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/consent/renew");

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          개인정보 수집·이용 재동의
        </h1>
        <p className="text-sm text-ink-soft">
          개인정보 보유 기간(1년) 만료가 임박하여 재동의를 받습니다. 동의하시면
          오늘부터 보유 기간이 1년 연장됩니다.
        </p>
      </header>
      <RenewForm userId={user.id} />
    </div>
  );
}
