// POST /api/consent/check-deleted
// body: { email: string }
// 응답: { deleted: boolean }
//
// 로그인 실패 시 해당 이메일이 동의 만료로 삭제된 회원인지 확인하기 위한 엔드포인트.
// tombstone 테이블은 RLS로 anon 접근 차단되어 있으므로 service_role 경유.
// 삭제 시각(deleted_at)은 비인증 호출자에게 노출하지 않음 — 존재 여부(boolean)만 반환.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ deleted: false });
  }

  if (typeof email !== "string" || !email.endsWith("@sk.com")) {
    return NextResponse.json({ deleted: false });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("consent_deletions")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    // tombstone 테이블 미생성 등 — 안내 생략하고 fail-open.
    return NextResponse.json({ deleted: false });
  }

  return NextResponse.json({ deleted: !!data });
}
