// 인앱 브라우저가 아닌 접속(일반 브라우저 등)에 노출되는 안내 페이지.
// 미들웨어가 구성원 콘텐츠 경로를 이 페이지로 rewrite 한다.
export const metadata = {
  title: "앱에서 열어주세요 · SK Bioscience ECO Bio 도서관",
};

export default function AppRequiredPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf8] px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EA002C]/10">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EA002C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-[#1a1a1a]">
          회사 앱에서 열어주세요
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#555]">
          SK Bioscience ECO Bio 도서관은 <b>회사 모바일앱</b>을 통해서만
          이용할 수 있습니다.
          <br />
          일반 웹브라우저에서는 도서 조회·대여현황을 볼 수 없어요.
        </p>

        <div className="mt-6 rounded-xl border border-[#e5e5e0] bg-white p-4 text-left text-sm text-[#444]">
          <p className="font-semibold text-[#1a1a1a]">이용 방법</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>회사 모바일앱을 실행합니다.</li>
            <li>앱 안에서 도서관 메뉴로 접속합니다.</li>
          </ol>
        </div>

        <p className="mt-6 text-xs text-[#999]">
          © SK Bioscience · 사내 도서 관리 시스템
        </p>
      </div>
    </main>
  );
}
