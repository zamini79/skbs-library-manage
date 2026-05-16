// Edge runtime 미들웨어 — /admin/* 보호
// /admin/login은 제외 (matcher), 그 외 admin 경로는 admin_session 쿠키 검증
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth/admin-auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const admin = token ? await verifyAdminToken(token) : null;

  if (!admin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // /admin/* 전체 보호하되 /admin/login은 제외
  matcher: ["/admin/((?!login).*)"],
};
