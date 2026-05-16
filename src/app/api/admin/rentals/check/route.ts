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
