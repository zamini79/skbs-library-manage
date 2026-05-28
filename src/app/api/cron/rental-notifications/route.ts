// GET /api/cron/rental-notifications — Vercel Cron 일일 호출 (매일 09:00 KST = 00:00 UTC)
//
// 동작:
//   1) status active/overdue 인 모든 대여를 사용자/책 정보와 함께 조회
//   2) 각 대여마다 KST 기준 day diff = (due_date::date - today::date)
//        2  → due_2  "X일 남았어요"
//        1  → due_1
//        0  → due_0
//      <0  → overdue, |diff| 일 연체
//   3) public.rental_notifications 에 (rental_id, type, today_KST) INSERT
//      - UNIQUE 제약으로 ON CONFLICT DO NOTHING → 같은 날 재시도해도 한 번만 발송
//      - INSERT 성공한 경우에만 메일 발송
//   4) SMTP 자격증명은 src/lib/mail.ts (회원가입 인증용 메일 계정과 동일)
//
// Authorization: Bearer <CRON_SECRET> 헤더 필수.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

type NotificationType = "due_2" | "due_1" | "due_0" | "overdue";

// KST 기준 오늘 YYYY-MM-DD
function todayKstISODate(): string {
  // toLocaleString을 거쳐 KST 컴포넌트 추출
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA = YYYY-MM-DD
}

// KST 기준 due_date 의 캘린더 일자(YYYY-MM-DD)
function kstISODate(isoTs: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTs));
}

// (dueKst - todayKst) 일 차이 (정수)
function dayDiff(dueKst: string, todayKst: string): number {
  // YYYY-MM-DD 를 UTC midnight 타임스탬프로 환산해서 day 단위 차이 계산 (DST 없는 KST 이므로 정확)
  const d1 = Date.parse(`${dueKst}T00:00:00Z`);
  const d2 = Date.parse(`${todayKst}T00:00:00Z`);
  return Math.round((d1 - d2) / 86400000);
}

function classify(diff: number): NotificationType | null {
  if (diff === 2) return "due_2";
  if (diff === 1) return "due_1";
  if (diff === 0) return "due_0";
  if (diff < 0) return "overdue";
  return null;
}

function buildEmail(
  type: NotificationType,
  diff: number,
  name: string | null,
  title: string,
  dueKst: string,
): { subject: string; text: string; html: string } {
  const displayName = name ? `${name}님` : "안녕하세요";

  if (type === "overdue") {
    const overdueDays = Math.abs(diff);
    const subject = `[사내 도서관] '${title}' 대여 ${overdueDays}일 연체 중`;
    const text = `${displayName},

대여 중이신 도서 '${title}'의 대여기간이 만료되어 ${overdueDays}일 연체되고 있습니다.
반납기한: ${dueKst}

빠른 시일 내 반납 부탁드립니다.

— SK Bioscience 사내 도서관`;
    const html = text.replace(/\n/g, "<br>");
    return { subject, text, html };
  }

  const remaining = diff; // 2 / 1 / 0
  const headline =
    remaining === 0
      ? "오늘이 반납기한입니다"
      : `대여기간이 ${remaining}일 남았습니다`;
  const subject = `[사내 도서관] '${title}' ${headline}`;
  const text = `${displayName},

대여 중이신 도서 '${title}'의 ${headline}.
반납기한: ${dueKst}

기한 내 반납 부탁드립니다.

— SK Bioscience 사내 도서관`;
  const html = text.replace(/\n/g, "<br>");
  return { subject, text, html };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET_NOT_CONFIGURED" },
      { status: 500 },
    );
  }
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 대상 대여 조회 — active/overdue 만, 사용자/책 정보 join
  const { data: rentals, error: rErr } = await supabase
    .from("rentals")
    .select(
      "id, due_date, status, user:users!inner(id, email, name, is_active), book:books!inner(title)",
    )
    .in("status", ["active", "overdue"]);

  if (rErr) {
    return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
  }

  const todayKst = todayKstISODate();
  let attempted = 0;
  let sent = 0;
  let skippedDup = 0;
  let skippedNoMatch = 0;
  let skippedInactive = 0;
  const failures: Array<{ rental_id: string; error: string }> = [];

  for (const row of rentals ?? []) {
    // join 결과 — supabase-js 타입상 user/book 이 array 형태로 올 수 있어 안전 추출
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    const book = Array.isArray(row.book) ? row.book[0] : row.book;
    if (!user || !book) {
      skippedNoMatch++;
      continue;
    }
    if (!user.is_active || !user.email) {
      skippedInactive++;
      continue;
    }

    const dueKst = kstISODate(row.due_date as string);
    const diff = dayDiff(dueKst, todayKst);
    const type = classify(diff);
    if (!type) continue; // 알림 대상 아님 (D-3 이상 등)

    attempted++;

    // 중복 방지: 이력 테이블에 먼저 INSERT 시도, 충돌 시 발송 생략
    const { error: insErr } = await supabase
      .from("rental_notifications")
      .insert({
        rental_id: row.id,
        notification_type: type,
        sent_for_date: todayKst,
      });
    if (insErr) {
      // PostgREST 23505 = unique_violation
      if (insErr.code === "23505") {
        skippedDup++;
        continue;
      }
      failures.push({ rental_id: row.id, error: insErr.message });
      continue;
    }

    try {
      const mail = buildEmail(type, diff, user.name ?? null, book.title, dueKst);
      await sendMail({
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      sent++;
    } catch (e) {
      // 발송 실패 시 이력 행을 롤백 → 다음 cron 에서 재시도되도록
      await supabase
        .from("rental_notifications")
        .delete()
        .eq("rental_id", row.id)
        .eq("notification_type", type)
        .eq("sent_for_date", todayKst);
      failures.push({
        rental_id: row.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    today_kst: todayKst,
    candidates: rentals?.length ?? 0,
    attempted,
    sent,
    skipped_duplicate: skippedDup,
    skipped_inactive_user: skippedInactive,
    skipped_no_match: skippedNoMatch,
    failures,
    timestamp: new Date().toISOString(),
  });
}
