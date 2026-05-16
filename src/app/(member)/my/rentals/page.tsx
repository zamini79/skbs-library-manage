// 내 대여현황 — 로그인 필수
// Day 4 버전: 본인 프로필 + 정책 안내 + (빈) 대여 목록. Day 6에 실제 대여 데이터 연결.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RENTAL_POLICY } from "@/lib/policies";

export default async function MyRentalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my/rentals");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, employee_no, department, mileage, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // 인증은 됐는데 프로필이 없음 → Step 3로 유도
    redirect("/signup/complete");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">내 대여현황</h1>
        <p className="text-sm text-muted-foreground">
          {profile.name}님의 대여 정보입니다.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            사번
          </div>
          <div className="font-mono text-md">{profile.employee_no}</div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            부서
          </div>
          <div className="text-md">{profile.department}</div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            마일리지
          </div>
          <div className="font-mono tabular text-md">
            {profile.mileage.toLocaleString()}점
          </div>
        </div>
        <div className="bg-card border rounded-md p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            이메일
          </div>
          <div className="font-mono text-xs break-all">{profile.email}</div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">현재 대여 중</h2>
        <div className="bg-muted rounded-md p-8 text-center text-sm text-muted-foreground">
          <div className="text-2xl mb-2">📚</div>
          현재 대여 중인 도서가 없습니다.
        </div>
      </section>

      <section className="bg-card border rounded-md p-4 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground mb-2">대여 정책</div>
        <div>대여 기간: {RENTAL_POLICY.RENTAL_PERIOD_DAYS}일</div>
        <div>월 최대 대여: {RENTAL_POLICY.MAX_MONTHLY_RENTALS}회</div>
        <div>동시 보유: 최대 {RENTAL_POLICY.MAX_CONCURRENT_HOLDINGS}권</div>
        <div>연장: 불가 · 연체 중 신규 대여 불가</div>
      </section>
    </div>
  );
}
