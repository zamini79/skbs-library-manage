// 관리자 인증 헬퍼 — JWT (jose) + httpOnly 쿠키
// 구성원 인증(Supabase Auth)과 별도. service_role로 admins 테이블 직접 조회.
//
// - signAdminToken/verifyAdminToken: jose 기반 (Edge runtime 호환)
// - getAdminFromCookie: 서버 컴포넌트/API에서 호출
// - requireAny/requireMaster: 페이지 가드 (인증 안 됐으면 redirect)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Database } from "@/types/database.types";
import { ADMIN_ROLES, type AdminRole } from "@/lib/policies";

export const ADMIN_COOKIE_NAME = "admin_session";
const TOKEN_MAX_AGE_SEC = 60 * 60 * 8; // 8시간 (자동 로그인 비활성)
const TOKEN_REMEMBER_MAX_AGE_SEC = 60 * 60 * 24 * 180; // 6개월 (자동 로그인 활성)
const TOKEN_ISSUER = "skbs-library";
const TOKEN_AUDIENCE = "skbs-admin";

export type AdminTokenPayload = {
  adminId: string;
  loginId: string;
  role: AdminRole;
  name: string;
};

type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET env var not set");
  }
  return new TextEncoder().encode(secret);
}

function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === "string" && (ADMIN_ROLES as readonly string[]).includes(v);
}

export async function signAdminToken(
  payload: AdminTokenPayload,
  rememberMe = false,
): Promise<string> {
  const maxAge = rememberMe ? TOKEN_REMEMBER_MAX_AGE_SEC : TOKEN_MAX_AGE_SEC;
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .sign(getSecret());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    if (
      typeof payload.adminId === "string" &&
      typeof payload.loginId === "string" &&
      typeof payload.name === "string" &&
      isAdminRole(payload.role)
    ) {
      return {
        adminId: payload.adminId,
        loginId: payload.loginId,
        role: payload.role,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setAdminCookie(token: string, rememberMe = false) {
  cookies().set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 자동 로그인: 6개월 maxAge / 미체크: 세션 쿠키 (브라우저 종료 시 소멸).
    // 세션 쿠키는 maxAge 를 생략해야 하므로 조건부 spread 사용.
    ...(rememberMe ? { maxAge: TOKEN_REMEMBER_MAX_AGE_SEC } : {}),
  });
}

export async function clearAdminCookie() {
  cookies().delete(ADMIN_COOKIE_NAME);
}

export async function getAdminFromCookie(): Promise<AdminTokenPayload | null> {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

/** master/book 둘 다 허용. 인증 안 됐으면 /admin/login으로 리디렉트. */
export async function requireAny(): Promise<AdminTokenPayload> {
  const admin = await getAdminFromCookie();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** master 권한만 허용. book이면 dashboard로 리디렉트, 미인증이면 login으로. */
export async function requireMaster(): Promise<AdminTokenPayload> {
  const admin = await getAdminFromCookie();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "master") redirect("/admin/dashboard");
  return admin;
}

export function adminRoleLabel(role: AdminRole): string {
  return role === "master" ? "마스터 관리자" : "대여 관리자";
}

/**
 * API 라우트에서 마스터 권한 요구. AdminTokenPayload | NextResponse 반환.
 * NextResponse면 그대로 return 해서 401/403 응답.
 */
export async function getMasterOrError(): Promise<
  AdminTokenPayload | import("next/server").NextResponse
> {
  const { NextResponse } = await import("next/server");
  const admin = await getAdminFromCookie();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  if (admin.role !== "master") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    );
  }
  return admin;
}

/** API 라우트에서 master/book 둘 다 허용. */
export async function getAnyOrError(): Promise<
  AdminTokenPayload | import("next/server").NextResponse
> {
  const { NextResponse } = await import("next/server");
  const admin = await getAdminFromCookie();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  return admin;
}

export type { AdminRow };
