// 레거시 대여 데이터 이관 — doc/book_list.xlsm (시트 "2605") 기준
//
// 사용법:
//   node scripts/import-legacy-rentals.mjs            # dry-run (기본, 실제 미적용)
//   node scripts/import-legacy-rentals.mjs --apply    # 실제 적용
//   node scripts/import-legacy-rentals.mjs --limit=10 # 앞 N건만 처리 (테스트)
//
// 동작:
//   1) 시트 2605 헤더로 컬럼 매핑 (구분/대여일·반납일/email/사번/이름/팀명/도서명)
//   2) 책 제목 정규화 매칭 (공백·구두점 제거 후 비교) — 못 찾으면 unmatched 보고
//   3) 신규 사용자: auth.admin.createUser (랜덤 비번) + public.users INSERT
//      (must_change_password=TRUE, consent_given_at=NOW), 환영 메일에 /reset-password?email= 링크
//   4) 대여:
//      - status=active : 단순 INSERT (decrease_book_availability 트리거 -1)
//      - status=returned: INSERT(active) → UPDATE(returned, returned_at=rented_at+10d, return_admin_id=cs_admin)
//        → process_book_return 트리거가 available +1, mileage +10 부여 (Q3-B: 정시반납으로 분류)
//   5) 영향받은 books.available_quantity 보정: total_quantity - count(active rentals)
//   6) 멱등성: 동일 (user_id, book_id, rented_at) 행 이미 있으면 스킵.
//
// 필요 env (.env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   NEXT_PUBLIC_SITE_URL (없으면 https://skbs-library-manage.vercel.app 기본)
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import xlsx from "xlsx";

// ---------------- env ----------------
function parseEnv(path) {
  const env = {};
  for (const line of fs.readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}
const E = parseEnv(".env.local");
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!E[k]) { console.error(`❌ .env.local ${k} 누락`); process.exit(1); }
}
const SITE_URL = E.NEXT_PUBLIC_SITE_URL || "https://skbs-library-manage.vercel.app";

const sb = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------- args ----------------
const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
let LIMIT = Infinity;
for (const a of args) {
  const m = a.match(/^--limit=(\d+)$/);
  if (m) LIMIT = Number(m[1]);
}
console.log(`mode: ${APPLY ? "APPLY (실제 적용)" : "DRY-RUN"}  limit: ${LIMIT === Infinity ? "all" : LIMIT}\n`);

// ---------------- excel ----------------
const FILE = "doc/book_list.xlsm";
const SHEET = "2605";
const wb = xlsx.readFile(FILE);
const sheet = wb.Sheets[SHEET];
if (!sheet) { console.error(`❌ 시트 "${SHEET}" 없음`); process.exit(1); }
const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

// 헤더 행 찾기 — "구분"/"email"/"이름" 등이 있는 행
let headerIdx = raw.findIndex((r) => Array.isArray(r) && r.includes("구분") && r.includes("email"));
if (headerIdx < 0) { console.error("❌ 헤더 행을 찾지 못함"); process.exit(1); }
const headers = raw[headerIdx];
const col = (name) => headers.indexOf(name);
const COL = {
  status: col("구분"),
  date:   col("대여일/반납일"),
  email:  col("email"),
  empno:  col("사번"),
  name:   col("이름"),
  team:   col("팀명"),
  title:  col("도서명"),
};
for (const [k, v] of Object.entries(COL)) {
  if (v < 0) { console.error(`❌ 헤더 컬럼 누락: ${k}`); process.exit(1); }
}

// ---------------- normalize ----------------
function normTitle(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/[\s ·\-_,.!?()\[\]【】「」"'：:]+/g, "")
    .trim();
}
function parseDate(s) {
  if (!s) return null;
  // 예: "2026/04/30 10:16"
  const m = String(s).trim().match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  // KST 로 해석 → UTC ISO
  const kst = new Date(
    `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}T${(hh||"00").padStart(2,"0")}:${(mm||"00").padStart(2,"0")}:${(ss||"00").padStart(2,"0")}+09:00`,
  );
  return kst.toISOString();
}
function addDaysISO(iso, days) {
  return new Date(Date.parse(iso) + days * 86400000).toISOString();
}

// ---------------- parse rows ----------------
const rows = [];
const skipped = [];
for (let i = headerIdx + 1; i < raw.length && rows.length < LIMIT; i++) {
  const r = raw[i];
  if (!Array.isArray(r)) continue;
  const status = r[COL.status];
  if (!status) continue; // 빈 행
  const email = String(r[COL.email] ?? "").trim().toLowerCase();
  const empno = String(r[COL.empno] ?? "").trim();
  const name = String(r[COL.name] ?? "").trim();
  const team = String(r[COL.team] ?? "").trim();
  const title = String(r[COL.title] ?? "").trim();
  const rented_at = parseDate(r[COL.date]);
  const st = status === "반납" ? "returned" : status === "대여" ? "active" : null;
  if (!st) { skipped.push({ row: i+1, reason: `unknown status "${status}"` }); continue; }
  if (!email || !empno || !name || !team || !title || !rented_at) {
    skipped.push({ row: i+1, reason: "missing field(s)", email, title });
    continue;
  }
  const due_date = addDaysISO(rented_at, 14);
  const returned_at = st === "returned" ? addDaysISO(rented_at, 10) : null;
  rows.push({ status: st, email, empno, name, team, title, rented_at, due_date, returned_at });
}
console.log(`parsed: ${rows.length}, skipped: ${skipped.length}`);

// ---------------- fetch references ----------------
const { data: booksData, error: bErr } = await sb
  .from("books")
  .select("id, title, total_quantity");
if (bErr) { console.error("books fetch error:", bErr.message); process.exit(1); }
const bookByNorm = new Map();
for (const b of booksData) bookByNorm.set(normTitle(b.title), b);

const { data: adminData, error: aErr } = await sb
  .from("admins")
  .select("id, login_id, role")
  .eq("login_id", "cs_admin@sk.com")
  .maybeSingle();
if (aErr || !adminData) { console.error("cs_admin 못 찾음:", aErr?.message); process.exit(1); }
const CS_ADMIN_ID = adminData.id;

const emails = [...new Set(rows.map((r) => r.email))];
const { data: existingUsers } = await sb
  .from("users")
  .select("id, email")
  .in("email", emails);
const userByEmail = new Map((existingUsers ?? []).map((u) => [u.email, u.id]));

// ---------------- match books ----------------
const matchedRows = [];
const unmatchedTitles = new Map(); // title → count
for (const r of rows) {
  const book = bookByNorm.get(normTitle(r.title));
  if (!book) {
    unmatchedTitles.set(r.title, (unmatchedTitles.get(r.title) ?? 0) + 1);
    continue;
  }
  matchedRows.push({ ...r, book_id: book.id, book_title: book.title, book_total: book.total_quantity });
}
console.log(`matched: ${matchedRows.length}, unmatched titles: ${unmatchedTitles.size}`);
if (unmatchedTitles.size > 0) {
  console.log(`\n=== 매칭 실패 도서 (system 에 없음) ===`);
  for (const [t, n] of unmatchedTitles) console.log(`  [${n}건] "${t}"`);
}

// ---------------- plan users ----------------
const usersToCreate = [];
for (const email of emails) {
  if (userByEmail.has(email)) continue;
  const sample = rows.find((r) => r.email === email);
  if (!sample) continue;
  usersToCreate.push({ email, employee_no: sample.empno, name: sample.name, department: sample.team });
}
console.log(`\nusers to create: ${usersToCreate.length}, existing: ${emails.length - usersToCreate.length}`);

// 요약 — rentals 분포
const activeCount = matchedRows.filter((r) => r.status === "active").length;
const returnedCount = matchedRows.filter((r) => r.status === "returned").length;
console.log(`rentals plannable: active=${activeCount}, returned=${returnedCount}`);

if (skipped.length > 0) {
  console.log(`\n=== skipped rows (앞 10건) ===`);
  for (const s of skipped.slice(0, 10)) console.log(`  row ${s.row}: ${s.reason}`);
}

if (!APPLY) {
  console.log(`\n[DRY-RUN] 실제 적용하려면 --apply 추가`);
  process.exit(0);
}

// ============================================================
// APPLY 모드
// ============================================================
console.log(`\n=== APPLY 시작 ===\n`);

function genPassword() {
  // 16자 영숫자
  return crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 16) + "A1!";
}
function mailerOrNull() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const miss = required.filter((k) => !E[k]);
  if (miss.length) { console.warn(`⚠ SMTP env 누락 (${miss.join(", ")}) — 환영 메일 발송 생략`); return null; }
  const port = Number(E.SMTP_PORT);
  const secure = E.SMTP_SECURE ? E.SMTP_SECURE === "true" : port === 465;
  return nodemailer.createTransport({
    host: E.SMTP_HOST, port, secure,
    auth: { user: E.SMTP_USER, pass: E.SMTP_PASS },
  });
}
const mailer = mailerOrNull();

let createdUsers = 0;
let welcomeOk = 0;
let welcomeFail = 0;
const userCreateFails = [];

for (const u of usersToCreate) {
  const tempPw = genPassword();
  const { data: created, error: cErr } = await sb.auth.admin.createUser({
    email: u.email, password: tempPw, email_confirm: true,
  });
  if (cErr || !created?.user) {
    userCreateFails.push({ email: u.email, error: cErr?.message || "no user returned" });
    continue;
  }
  const userId = created.user.id;
  const { error: pErr } = await sb.from("users").insert({
    id: userId,
    email: u.email,
    employee_no: u.employee_no,
    name: u.name,
    department: u.department,
    consent_given_at: new Date().toISOString(),
    must_change_password: true,
  });
  if (pErr) {
    userCreateFails.push({ email: u.email, error: `public.users: ${pErr.message}` });
    continue;
  }
  userByEmail.set(u.email, userId);
  createdUsers++;
  // 환영 메일 발송
  if (mailer) {
    const link = `${SITE_URL}/reset-password?email=${encodeURIComponent(u.email)}`;
    const subject = "[SK Bioscience 사내 도서관] 계정 이관 및 비밀번호 설정 안내";
    const text = `${u.name}님,

기존 사내 도서관 시스템의 대여 정보를 새 시스템에 이관했습니다.
처음 로그인하시려면 본인 비밀번호 설정이 필요합니다.

→ 비밀번호 설정 페이지: ${link}

위 링크에서 본인 이메일을 확인하고 "재설정 메일 받기"를 누르시면
새 비밀번호 설정 메일이 다시 한 번 발송됩니다. 메일의 링크를 통해
비밀번호를 직접 설정하신 뒤 로그인해 주세요.

— SK Bioscience 사내 도서관`;
    const html = `<div style="font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;font-size:11pt;line-height:1.6;">${text.replace(/\n/g, "<br>")}</div>`;
    try {
      await mailer.sendMail({ from: E.SMTP_FROM, to: u.email, subject, text, html });
      welcomeOk++;
    } catch (e) {
      welcomeFail++;
      console.error(`  welcome mail fail ${u.email}: ${e?.message ?? e}`);
    }
  }
  console.log(`  + user ${u.email} (${u.name})`);
}

// ---------------- rentals ----------------
let activeInserted = 0;
let returnedInserted = 0;
let rentalSkipped = 0;
const rentalFails = [];

for (const r of matchedRows) {
  const userId = userByEmail.get(r.email);
  if (!userId) { rentalSkipped++; continue; }

  // 멱등성: 동일 (user_id, book_id, rented_at) 이미 존재하면 skip
  const { data: exist } = await sb
    .from("rentals")
    .select("id")
    .eq("user_id", userId)
    .eq("book_id", r.book_id)
    .eq("rented_at", r.rented_at)
    .maybeSingle();
  if (exist) { rentalSkipped++; continue; }

  if (r.status === "active") {
    const { error: ie } = await sb.from("rentals").insert({
      user_id: userId,
      book_id: r.book_id,
      admin_id: CS_ADMIN_ID,
      rented_at: r.rented_at,
      due_date: r.due_date,
      status: "active",
    });
    if (ie) rentalFails.push({ row: `${r.email} / ${r.book_title}`, error: ie.message });
    else activeInserted++;
  } else {
    // returned: INSERT active → UPDATE returned 로 트리거 마일리지 부여
    const { data: ins, error: ie } = await sb.from("rentals").insert({
      user_id: userId,
      book_id: r.book_id,
      admin_id: CS_ADMIN_ID,
      rented_at: r.rented_at,
      due_date: r.due_date,
      status: "active",
    }).select("id").single();
    if (ie || !ins) {
      rentalFails.push({ row: `${r.email} / ${r.book_title}`, error: ie?.message || "no id" });
      continue;
    }
    const { error: ue } = await sb.from("rentals").update({
      status: "returned",
      returned_at: r.returned_at,
      return_admin_id: CS_ADMIN_ID,
    }).eq("id", ins.id);
    if (ue) rentalFails.push({ row: `${r.email} / ${r.book_title}`, error: `update: ${ue.message}` });
    else returnedInserted++;
  }
}

// ---------------- 보정: books.available_quantity = total - count(active) ----------------
const affectedBookIds = [...new Set(matchedRows.map((r) => r.book_id))];
let booksFixed = 0;
const overQty = [];
for (const bid of affectedBookIds) {
  const book = booksData.find((b) => b.id === bid);
  if (!book) continue;
  const { count: activeCnt } = await sb
    .from("rentals")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bid)
    .in("status", ["active", "overdue"]);
  const target = Math.max(0, book.total_quantity - (activeCnt ?? 0));
  if ((activeCnt ?? 0) > book.total_quantity) {
    overQty.push({ title: book.title, total: book.total_quantity, active: activeCnt });
  }
  const { error: ue } = await sb
    .from("books")
    .update({ available_quantity: target })
    .eq("id", bid);
  if (!ue) booksFixed++;
}

// ---------------- 보고 ----------------
console.log(`\n=== APPLY 결과 ===`);
console.log(`사용자 신규 생성: ${createdUsers}`);
console.log(`사용자 생성 실패: ${userCreateFails.length}`);
for (const f of userCreateFails) console.log(`  - ${f.email}: ${f.error}`);
console.log(`환영 메일: ok=${welcomeOk} fail=${welcomeFail}`);
console.log(`대여 — active INSERT: ${activeInserted}, returned INSERT+UPDATE: ${returnedInserted}, skip(중복): ${rentalSkipped}, fail: ${rentalFails.length}`);
for (const f of rentalFails.slice(0, 20)) console.log(`  - ${f.row}: ${f.error}`);
console.log(`books.available_quantity 보정: ${booksFixed} books`);
if (overQty.length) {
  console.log(`\n⚠ 활성 대여 수가 total_quantity 초과 (available=0 처리):`);
  for (const o of overQty) console.log(`  "${o.title}" total=${o.total} active=${o.active}`);
}
if (unmatchedTitles.size > 0) {
  console.log(`\n매칭 실패 도서는 위 목록 참조 — 시스템에 추가하시거나 매핑 조정 후 재실행`);
}
