// Edge 미들웨어
//  1) /admin/*  — 관리자 세션 인증 (PC 브라우저 기반, 인앱 게이트 미적용)
//  2) 구성원 콘텐츠 경로(/, /books, /ranking, /my) — 인앱 브라우저만 허용
//     (계정 흐름 /login·/signup·/reset-password·/auth·/consent·/change-password 는 대상 아님)
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-auth";
import {
  classifyClient,
  getGateMode,
  isBlocked,
  isCompanyIp,
  isGatedPath,
} from "@/lib/inapp";

const BYPASS_COOKIE = "inapp_bypass";
const BYPASS_MAX_AGE = 60 * 60 * 24 * 180; // 180일

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
  //    허용 = 인앱 브라우저 OR 회사 IP OR 우회 키(개발자 개인 접속)
  if (isGatedPath(pathname)) {
    const mode = getGateMode();
    if (mode !== "off") {
      const bypassKey = process.env.INAPP_GATE_BYPASS_KEY;

      // 2-a) ?key=<비밀키> 로 접속 시 → 우회 쿠키 저장 후 key 제거하고 리다이렉트
      if (bypassKey && req.nextUrl.searchParams.get("key") === bypassKey) {
        const clean = req.nextUrl.clone();
        clean.searchParams.delete("key");
        const res = NextResponse.redirect(clean);
        res.cookies.set(BYPASS_COOKIE, bypassKey, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: BYPASS_MAX_AGE,
        });
        return res;
      }

      const hasBypass =
        !!bypassKey && req.cookies.get(BYPASS_COOKIE)?.value === bypassKey;
      const ipAllowed = isCompanyIp(req.ip ?? req.headers.get("x-real-ip"));
      const klass = classifyClient(req.headers.get("user-agent"));

      if (isBlocked(klass, mode) && !ipAllowed && !hasBypass) {
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
