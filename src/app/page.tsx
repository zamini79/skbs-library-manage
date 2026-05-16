import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="container mx-auto py-12 space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          SK Bioscience 사내 도서관
        </h1>
        <p className="text-md text-muted-foreground">
          Day 1 디자인 토큰 적용 확인용 페이지
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">텍스트 컬러</h2>
        <p className="text-foreground">
          이것은 <code className="font-mono">text-foreground</code> — 본문 기본
          색상입니다.
        </p>
        <p className="text-muted-foreground">
          이것은 <code className="font-mono">text-muted-foreground</code> —
          보조 텍스트 색상입니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">버튼</h2>
        <div className="flex flex-wrap gap-3">
          <Button>기본 버튼 (primary)</Button>
          <Button variant="destructive">SK 레드 버튼 (destructive)</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">상태 뱃지</h2>
        <div className="flex flex-wrap gap-2">
          <span className="badge-available">대여 가능</span>
          <span className="badge-active">~2026-05-30</span>
          <span className="badge-overdue">연체 D+3</span>
        </div>
      </section>
    </main>
  );
}
