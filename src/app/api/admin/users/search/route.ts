// GET /api/admin/users/search?q=... — 활성 사용자 검색 (대여 등록용)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnyOrError } from "@/lib/auth/admin-auth";
import { safeIlike } from "@/lib/safe-ilike";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrErr = await getAnyOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length === 0) {
    return NextResponse.json({ users: [] });
  }

  const safe = safeIlike(q);
  if (safe.length === 0) {
    return NextResponse.json({ users: [] });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, employee_no, department, mileage")
    .eq("is_active", true)
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,employee_no.ilike.%${safe}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data ?? [] });
}
