// POST /api/admin/rentals — 대출 등록 (master/book 둘 다)
// Body: { user_id, book_id }
// 1) check_rental_eligibility로 정책 재검증 (UI 우회 차단)
// 2) INSERT rentals — trigger가 books.available_quantity 자동 감소
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { computeDueDate } from "@/lib/rental-due";

export const runtime = "nodejs";

const Body = z.object({
  user_id: z.string().uuid(),
  book_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;
  const admin = adminOrErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_FAILED", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { user_id, book_id } = parsed.data;

  const supabase = createAdminClient();

  // 정책 재검증 (서버측)
  const { data: eligData, error: eligErr } = await supabase.rpc(
    "check_rental_eligibility",
    { p_user_id: user_id, p_book_id: book_id },
  );
  if (eligErr) {
    return NextResponse.json({ ok: false, error: eligErr.message }, { status: 500 });
  }
  const elig = eligData as { eligible: boolean } & Record<string, unknown>;
  if (!elig?.eligible) {
    return NextResponse.json(
      { ok: false, error: "NOT_ELIGIBLE", eligibility: elig },
      { status: 422 },
    );
  }

  const now = new Date();
  const dueDateIso = computeDueDate(now);

  const { data, error } = await supabase
    .from("rentals")
    .insert({
      user_id,
      book_id,
      admin_id: admin.adminId,
      rented_at: now.toISOString(),
      due_date: dueDateIso,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    due_date: dueDateIso,
  });
}
