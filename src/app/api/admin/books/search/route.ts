// GET /api/admin/books/search?q=... — 가용 도서 검색 (대여 등록용)
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
    return NextResponse.json({ books: [] });
  }

  const safe = safeIlike(q);
  if (safe.length === 0) {
    return NextResponse.json({ books: [] });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, publisher, category, available_quantity, total_quantity")
    .eq("status", "active")
    .gt("available_quantity", 0)
    .or(`title.ilike.%${safe}%,author.ilike.%${safe}%,publisher.ilike.%${safe}%`)
    .order("title", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ books: data ?? [] });
}
