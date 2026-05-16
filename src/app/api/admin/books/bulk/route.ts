// POST /api/admin/books/bulk — 도서 일괄 등록 (master 권한)
// Body: { rows: BookCreate[] }
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { BookCreateSchema } from "@/lib/books-schema";

export const runtime = "nodejs";

const BATCH_SIZE = 200;
const MAX_ROWS = 5000;

const Body = z.object({
  rows: z.array(BookCreateSchema).min(1).max(MAX_ROWS),
});

export async function POST(req: Request) {
  const adminOrErr = await getMasterOrError();
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

  const payload = parsed.data.rows.map((b) => ({
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    isbn: b.isbn,
    category: b.category,
    price: b.price,
    total_quantity: b.total_quantity,
    available_quantity: b.total_quantity,
    cover_url: b.cover_url,
    created_by: admin.adminId,
  }));

  const supabase = createAdminClient();

  let inserted = 0;
  const failures: Array<{ start: number; end: number; message: string }> = [];

  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const slice = payload.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from("books").insert(slice).select("id");
    if (error) {
      failures.push({ start: i, end: i + slice.length, message: error.message });
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    inserted,
    failures,
  });
}
