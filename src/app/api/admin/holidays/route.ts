// 자체 휴무일 관리 (master 권한)
//
//  POST   /api/admin/holidays          { date: "YYYY-MM-DD", name }  → 추가/수정
//  DELETE /api/admin/holidays?date=...                                → 삭제
//
// 두 작업 모두 source='manual' 행만 대상으로 한다. 공공데이터포털 동기화분('api')은
// 다음 동기화 때 되살아나므로 화면에서 손대지 못하게 막는다.
//
// 휴무일을 추가하면 기한이 남은 대출의 반납일도 곧바로 다음 영업일로 보정한다
// (그렇게 하지 않으면 쉬는 날이 반납기한으로 남는다).
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { adjustFutureDueDates } from "@/lib/holidays";
import { isValidDateString } from "@/lib/kst";

export const runtime = "nodejs";

const Body = z.object({
  date: z.string().refine(isValidDateString, "날짜 형식이 올바르지 않습니다."),
  name: z.string().trim().min(1, "명칭을 입력해주세요.").max(50),
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "VALIDATION_FAILED" },
      { status: 400 },
    );
  }
  const { date, name } = parsed.data;
  const supabase = createAdminClient();

  // 같은 날짜가 이미 API 동기화분으로 있으면 중복 등록을 막는다(이미 공휴일이므로).
  const { data: existing, error: selErr } = await supabase
    .from("holidays")
    .select("date, source")
    .eq("date", date)
    .maybeSingle();
  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
  }
  if (existing && (existing as { source: string }).source === "api") {
    return NextResponse.json(
      { ok: false, error: "이미 공휴일로 등록된 날짜입니다." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("holidays")
    .upsert({ date, name, source: "manual" }, { onConflict: "date" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 새 휴무일이 반납기한인 대출을 다음 영업일로 이월
  let adjusted = 0;
  try {
    adjusted = (await adjustFutureDueDates(supabase)).adjusted;
  } catch (e) {
    console.error("[admin/holidays] adjustFutureDueDates failed:", e);
  }

  return NextResponse.json({ ok: true, date, name, adjusted });
}

export async function DELETE(req: Request) {
  const adminOrErr = await getMasterOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!isValidDateString(date)) {
    return NextResponse.json({ ok: false, error: "INVALID_DATE" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // source='manual' 조건을 걸어 동기화분이 지워지지 않게 한다.
  const { data, error } = await supabase
    .from("holidays")
    .delete()
    .eq("date", date)
    .eq("source", "manual")
    .select("date");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "삭제할 수 있는 자체 휴무일이 아닙니다." },
      { status: 404 },
    );
  }

  // 이미 이월된 반납일은 되돌리지 않는다(사용자에게 통보된 기한을 앞당기면 혼란).
  return NextResponse.json({ ok: true, date });
}
