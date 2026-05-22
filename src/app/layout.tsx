import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

// 라이브러리 디자인 제목용 (Noto Serif KR). Tailwind: font-serif
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SK Bioscience 사내 도서관",
  description: "구성원 도서 대여 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${notoSerifKR.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Pretendard — Noto Sans KR 보다 더 균형 잡힌 한글 본문 폰트.
            Google Fonts에 없어서 CDN으로 로드. CSS variable로 노출되지는 않지만
            font-family 매칭으로 적용됨. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
