import { createClient } from "@/lib/supabase/server";
import { MemberHeader } from "@/components/member/MemberHeader";
import { MobileTopBar } from "@/components/member/MobileTopBar";
import { MobileBottomNav } from "@/components/member/MobileBottomNav";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    name = profile?.name ?? null;
  }

  const loggedIn = !!user;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      {/* 데스크탑 헤더 (md 이상) */}
      <div className="hidden md:contents">
        <MemberHeader name={name} />
      </div>
      {/* 모바일 상단 바 (md 미만) */}
      <MobileTopBar loggedIn={loggedIn} />

      <main className="flex-1 mx-auto w-full max-w-[1720px] px-4 md:px-8 pt-6 pb-28 md:pt-4 md:pb-6">
        {children}
      </main>

      {/* 데스크탑 푸터 */}
      <footer className="hidden md:block border-t border-line bg-paper py-4">
        <div className="container mx-auto text-xs text-ink-muted text-center">
          © SK Bioscience · 사내 도서 관리 시스템
        </div>
      </footer>
      {/* 모바일 하단 탭바 */}
      <MobileBottomNav loggedIn={loggedIn} />
    </div>
  );
}
