// POST /api/rental-requests
// 사용자 본인이 도서 대출 신청
// Body: { book_id }
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({ book_id: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED" },
      { status: 400 },
    );
  }
  const { book_id } = parsed.data;

  const admin = createAdminClient();

  // 1) 신청 자격 재검증 (UI 우회 차단)
  const { data: eligData, error: eligErr } = await admin.rpc(
    "check_rental_eligibility",
    { p_user_id: user.id, p_book_id: book_id },
  );
  if (eligErr) {
    return NextResponse.json(
      { ok: false, error: eligErr.message },
      { status: 500 },
    );
  }
  const elig = eligData as { eligible: boolean } & Record<string, unknown>;
  if (!elig?.eligible) {
    return NextResponse.json(
      { ok: false, error: "NOT_ELIGIBLE", eligibility: elig },
      { status: 422 },
    );
  }

  // 2) 이미 다른 사용자가 신청중인지 (UNIQUE INDEX가 동시성 차단하지만 친화적 에러 위해 선체크)
  const { data: existing } = await admin
    .from("rental_requests")
    .select("id, user_id")
    .eq("book_id", book_id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    if (existing.user_id === user.id) {
      return NextResponse.json(
        { ok: false, error: "ALREADY_REQUESTED_BY_SELF" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "ALREADY_REQUESTED_BY_OTHER" },
      { status: 409 },
    );
  }

  // 3) INSERT
  const { data: inserted, error: insErr } = await admin
    .from("rental_requests")
    .insert({ book_id, user_id: user.id, status: "pending" })
    .select("id")
    .single();
  if (insErr) {
    return NextResponse.json(
      { ok: false, error: insErr.message, code: insErr.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
