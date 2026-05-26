// POST /api/admin/login
// Body: { login_id: string, password: string }
// 성공 시 admin_session 쿠키 설정 + { ok: true, role, name } 반환
//
// runtime: nodejs (bcryptjs는 Edge runtime 미지원)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setAdminCookie,
  signAdminToken,
  type AdminTokenPayload,
} from "@/lib/auth/admin-auth";
import { ADMIN_ROLES, type AdminRole } from "@/lib/policies";

export const runtime = "nodejs";

function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === "string" && (ADMIN_ROLES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const { login_id, password, remember } = (body ?? {}) as {
    login_id?: unknown;
    password?: unknown;
    remember?: unknown;
  };

  if (typeof login_id !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { ok: false, error: "MISSING_FIELDS" },
      { status: 400 },
    );
  }
  const rememberMe = remember === true;

  const supabase = createAdminClient();

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, login_id, password_hash, role, name, is_active")
    .eq("login_id", login_id)
    .maybeSingle();

  // 인증 실패 메시지는 사용자에게 동일 형태로 노출 (계정 존재 여부 leak 방지)
  const invalid = NextResponse.json(
    { ok: false, error: "INVALID_CREDENTIALS" },
    { status: 401 },
  );

  if (error || !admin || !admin.is_active) {
    return invalid;
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return invalid;
  }

  if (!isAdminRole(admin.role)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ROLE" },
      { status: 500 },
    );
  }

  // last_login_at 갱신 (실패해도 로그인은 진행)
  await supabase
    .from("admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  const payload: AdminTokenPayload = {
    adminId: admin.id,
    loginId: admin.login_id,
    role: admin.role,
    name: admin.name,
  };
  const token = await signAdminToken(payload, rememberMe);
  await setAdminCookie(token, rememberMe);

  return NextResponse.json({ ok: true, role: admin.role, name: admin.name });
}
