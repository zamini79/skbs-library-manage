import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberHeader } from "@/components/member/MemberHeader";
import { MobileTopBar } from "@/components/member/MobileTopBar";
import { ConsentExpiryBanner } from "@/components/member/ConsentExpiryBanner";
import {
  CONSENT_WARNING_DAYS,
  getDaysUntilExpiry,
  isExpired,
} from "@/lib/consent";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 자동 로그인 마커 검증: Supabase 세션이 있는데 member_remember 쿠키가 없다면
  // (브라우저 재시작으로 세션 쿠키 소멸 또는 6개월 maxAge 만료) 자동 로그아웃.
  if (user) {
    const remember = cookies().get("member_remember");
    if (!remember) {
      redirect("/api/auth/expire");
    }
  }

  let name: string | null = null;
  let daysLeft: number | null = null;
  let mustChangePassword = false;
  if (user) {
    // consent 컬럼 포함 조회 — 마이그레이션 적용 전이면 error 반환되므로 fallback
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("name, email, consent_given_at, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      // 마이그레이션 미적용 케이스 — 이름만 별도 조회로 fallback
      const { data: fallback } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      name = fallback?.name ?? null;
    } else if (profile) {
      name = profile.name ?? null;
      mustChangePassword = !!(
        profile as { must_change_password?: boolean | null }
      ).must_change_password;

      const consentGivenAt = (profile as { consent_given_at?: string | null })
        .consent_given_at;
      if (consentGivenAt) {
        if (isExpired(consentGivenAt)) {
          // lazy delete: tombstone 기록 → auth 사용자 삭제 (CASCADE로 public.users 정리)
          const admin = createAdminClient();
          if (profile.email) {
            await admin.from("consent_deletions").upsert(
              { email: profile.email, deleted_at: new Date().toISOString() },
              { onConflict: "email" },
            );
          }
          await admin.auth.admin.deleteUser(user.id);
          redirect("/login?reason=consent_expired");
        }
        const remaining = getDaysUntilExpiry(consentGivenAt);
        if (remaining > 0 && remaining <= CONSENT_WARNING_DAYS) {
          daysLeft = remaining;
        }
      }
    }
  }

  const loggedIn = !!user;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      {/* 데스크탑 헤더 (md 이상) */}
      <div className="hidden md:contents">
        <MemberHeader name={name} />
      </div>
      {/* 모바일 상단 바 (md 미만) */}
      <MobileTopBar loggedIn={loggedIn} name={name} />

      {mustChangePassword && (
        <div className="bg-busy-soft border-y border-busy-border text-busy text-sm">
          <div className="mx-auto max-w-[1720px] px-4 md:px-8 py-2 flex items-center justify-between gap-3">
            <div>
              초기 임시 비밀번호 사용 중입니다 — 본인 비밀번호로 변경해 주세요.
            </div>
            <a
              href="/change-password"
              className="underline font-semibold whitespace-nowrap"
            >
              비밀번호 변경
            </a>
          </div>
        </div>
      )}
      {daysLeft !== null && <ConsentExpiryBanner daysLeft={daysLeft} />}

      {/* [임시] 인앱 브라우저 진단 링크 — 신호 확인 후 제거 예정 */}
      <a
        href="/whoami"
        className="block bg-yellow-300 text-black text-center text-sm font-semibold py-2 underline"
      >
        [임시] 접속 환경 진단 열기
      </a>

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-4 md:px-8 pt-6 pb-8 md:pt-2 md:pb-6">
        {children}
      </main>

      {/* 데스크탑 푸터 */}
      <footer className="hidden md:block border-t border-line bg-paper py-[11px]">
        <div className="container mx-auto text-xs text-ink-muted text-center">
          © SK Bioscience · 사내 도서 관리 시스템
        </div>
      </footer>
    </div>
  );
}
