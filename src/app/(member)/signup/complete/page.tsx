// Step 3 — 매직 링크 클릭 후 진입. 비밀번호 + 사번 + 이름 + 부서 입력 → users INSERT.
// 이미 프로필이 있으면 메인으로 리디렉트. 세션 없으면 /signup 으로 돌려보냄.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupCompleteForm } from "./SignupCompleteForm";

export default async function SignupCompletePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    // 이미 가입 완료된 사용자
    redirect("/");
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          프로필 작성
        </h1>
        <p className="text-sm text-ink-soft">
          이메일 인증 완료. 비밀번호와 기본 정보를 입력해주세요.
        </p>
      </header>

      <SignupCompleteForm email={user.email ?? ""} userId={user.id} />
    </div>
  );
}
