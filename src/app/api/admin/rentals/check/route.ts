// GET /api/admin/rentals/check?user_id=&book_id= — 대여 가능 여부 검증 (RPC 위임)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";

type Eligibility = {
  eligible: boolean;
  book_available: boolean;
  book_active: boolean;
  monthly_count: number;
  monthly_remaining: number;
  current_holding: number;
  holding_remaining: number;
  overdue_count: number;
  has_overdue: boolean;
  cooldown_until: string | null;
  in_cooldown: boolean;
  cooldown_days_remaining: number;
};

export async function GET(req: Request) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const url = new URL(req.url);
  const user_id = url.searchParams.get("user_id");
  const book_id = url.searchParams.get("book_id");

  if (!user_id || !book_id) {
    return NextResponse.json(
      { ok: false, error: "MISSING_PARAMS" },
      { status: 400 },
    );
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(user_id) || !UUID_RE.test(book_id)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PARAMS" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_rental_eligibility", {
    p_user_id: user_id,
    p_book_id: book_id,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, eligibility: data as Eligibility });
}
