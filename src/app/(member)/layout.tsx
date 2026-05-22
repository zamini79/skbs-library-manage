import { createClient } from "@/lib/supabase/server";
import { MemberHeader } from "@/components/member/MemberHeader";

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
      <MemberHeader name={name} />
      <main className="flex-1 container mx-auto py-8">{children}</main>
      <footer className="border-t border-line bg-paper py-4">
        <div className="container mx-auto text-xs text-ink-muted text-center">
          © SK Bioscience · 사내 도서 관리 시스템
        </div>
      </footer>
    </div>
  );
}
