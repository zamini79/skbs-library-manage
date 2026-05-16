import Link from "next/link";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight hover:text-primary transition-colors"
          >
            SK Bioscience 사내 도서관
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              로그인
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              회원가입
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto py-8">{children}</main>
      <footer className="border-t bg-card py-4">
        <div className="container mx-auto text-xs text-muted-foreground text-center">
          © SK Bioscience · 사내 도서 관리 시스템
        </div>
      </footer>
    </div>
  );
}
