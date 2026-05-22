import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/member/UserMenu";

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

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <header className="border-b border-line bg-paper">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg font-bold tracking-tight text-ink hover:text-library-accent transition-colors"
          >
            SK Bioscience 사내 도서관
          </Link>
          {name ? (
            <UserMenu name={name} />
          ) : (
            <nav className="flex gap-4 text-sm text-ink-soft">
              <Link
                href="/login"
                className="hover:text-ink transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="hover:text-ink transition-colors"
              >
                회원가입
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 container mx-auto py-8">{children}</main>
      <footer className="border-t border-line bg-paper py-4">
        <div className="container mx-auto text-xs text-ink-muted text-center">
          © SK Bioscience · 사내 도서 관리 시스템
        </div>
      </footer>
    </div>
  );
}
