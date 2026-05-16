// POST /api/admin/books/dispose
// Body: { ids: string[], reason: 'lost'|'damaged'|'outdated'|'other' }
//
// 정책: master 권한만, 대여 중인 책(available_quantity < total_quantity)은 폐기 불가.
// 응답: { ok, disposed: number, skipped: Array<{id, reason}> }
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";

const DISPOSAL_REASONS = ["lost", "damaged", "outdated", "other"] as const;

const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  reason: z.enum(DISPOSAL_REASONS),
});

export async function POST(req: Request) {
  const adminOrErr = await getMasterOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

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
  const { ids, reason } = parsed.data;

  const supabase = createAdminClient();

  // 대상 책 조회 — 폐기 가능 여부 판단
  const { data: targets, error: selectErr } = await supabase
    .from("books")
    .select("id, status, available_quantity, total_quantity")
    .in("id", ids);

  if (selectErr) {
    return NextResponse.json({ ok: false, error: selectErr.message }, { status: 500 });
  }

  const eligible: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const id of ids) {
    const t = targets?.find((b) => b.id === id);
    if (!t) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (t.status === "disposed") {
      skipped.push({ id, reason: "already_disposed" });
      continue;
    }
    if (t.available_quantity < t.total_quantity) {
      skipped.push({ id, reason: "has_active_rental" });
      continue;
    }
    eligible.push(id);
  }

  if (eligible.length === 0) {
    return NextResponse.json({ ok: true, disposed: 0, skipped });
  }

  const { error: updateErr, count } = await supabase
    .from("books")
    .update(
      {
        status: "disposed",
        disposed_at: new Date().toISOString(),
        disposal_reason: reason,
      },
      { count: "exact" },
    )
    .in("id", eligible);

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    disposed: count ?? eligible.length,
    skipped,
  });
}
