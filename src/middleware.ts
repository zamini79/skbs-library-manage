// Edge 미들웨어
//  1) /admin/*  — 관리자 세션 인증 (PC 브라우저 기반, 인앱 게이트 미적용)
//  2) 구성원 콘텐츠 경로(/, /books, /ranking, /my) — 인앱 브라우저만 허용
//     (계정 흐름 /login·/signup·/reset-password·/auth·/consent·/change-password 는 대상 아님)
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-auth";
import { classifyClient, getGateMode, isBlocked, isGatedPath } from "@/lib/inapp";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 관리자 경로 — /admin/login 제외하고 세션 검증
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const admin = token ? await verifyAdminToken(token) : null;
    if (!admin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) 구성원 콘텐츠 경로 — 인앱 브라우저 게이트
  if (isGatedPath(pathname)) {
    const mode = getGateMode();
    if (mode !== "off") {
      const klass = classifyClient(req.headers.get("user-agent"));
      if (isBlocked(klass, mode)) {
        // URL은 유지한 채 안내 페이지를 렌더 (리다이렉트 루프 없음)
        const url = req.nextUrl.clone();
        url.pathname = "/app-required";
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/books/:path*",
    "/ranking/:path*",
    "/my/:path*",
    "/admin/:path*",
  ],
};
