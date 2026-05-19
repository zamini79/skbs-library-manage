// Supabase 프로젝트 간 데이터 이관 스크립트
//
// 양쪽 creds 필요:
//   .env.local       — OLD 프로젝트 (지금 운영 중)
//   .env.new.local   — NEW 프로젝트 (이관 대상)
//
// 사전 조건: NEW 프로젝트에 schema.sql + description + admin email migration 적용 완료
//
// Usage:
//   MIGRATION_USER_PASSWORD='your-temp-password' node scripts/migrate-supabase.mjs
//
// MIGRATION_USER_PASSWORD: 이관된 public.users 들이 NEW auth.users 에 새로 생성될 때 부여할 임시 비밀번호.
// 이관 후 사용자가 직접 변경하도록 안내.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function parseEnv(path) {
  const env = {};
  for (const line of fs.readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const OLD = parseEnv(".env.local");
const NEW = parseEnv(".env.new.local");

for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!OLD[k]) {
    console.error(`❌ .env.local 에서 ${k} 누락`);
    process.exit(1);
  }
  if (!NEW[k]) {
    console.error(`❌ .env.new.local 에서 ${k} 누락`);
    process.exit(1);
  }
}

if (OLD.NEXT_PUBLIC_SUPABASE_URL === NEW.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ OLD와 NEW URL이 동일합니다. .env.new.local 확인하세요.");
  process.exit(1);
}

const oldSb = createClient(
  OLD.NEXT_PUBLIC_SUPABASE_URL,
  OLD.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const newSb = createClient(
  NEW.NEXT_PUBLIC_SUPABASE_URL,
  NEW.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

console.log(`OLD: ${OLD.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`NEW: ${NEW.NEXT_PUBLIC_SUPABASE_URL}\n`);

// ============ 1. Admins ============
console.log("=== 1) Admins ===");
{
  // NEW의 seed admins 제거 (login_id 이메일 형식)
  await newSb
    .from("admins")
    .delete()
    .in("login_id", ["cs_admin@sk.com", "book_admin@sk.com"]);

  const { data: oldAdmins, error } = await oldSb.from("admins").select("*");
  if (error) { console.error(error.message); process.exit(1); }

  // OLD의 login_id가 옛값이면 이메일 형식으로 매핑
  const map = { cs_admin: "cs_admin@sk.com", book_admin: "book_admin@sk.com" };
  for (const a of oldAdmins) {
    const row = { ...a, login_id: map[a.login_id] || a.login_id };
    const { error } = await newSb.from("admins").insert(row);
    if (error) console.error(" ", row.login_id, "FAIL:", error.message);
    else console.log("  ✓", row.login_id, "(id 보존:", a.id.slice(0, 8) + ")");
  }
}

// ============ 2. Users (auth + public) ============
console.log("\n=== 2) Users (auth + public) ===");
const userIdMap = new Map(); // old_id -> new_id
{
  const { data: oldUsers, error } = await oldSb.from("users").select("*");
  if (error) { console.error(error.message); process.exit(1); }

  for (const u of oldUsers) {
    // auth.users 생성 (NEW project)
    const tempPassword = process.env.MIGRATION_USER_PASSWORD;
    if (!tempPassword) {
      console.error("❌ MIGRATION_USER_PASSWORD env var 필수 (이관 사용자의 새 비밀번호)");
      process.exit(1);
    }
    const { data: created, error: e1 } = await newSb.auth.admin.createUser({
      email: u.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (e1) {
      console.error("  ", u.email, "auth FAIL:", e1.message);
      continue;
    }
    const newId = created.user.id;
    userIdMap.set(u.id, newId);

    // public.users 프로필 INSERT
    const { error: e2 } = await newSb.from("users").insert({
      id: newId,
      email: u.email,
      employee_no: u.employee_no,
      name: u.name,
      department: u.department,
      mileage: u.mileage,
      is_active: u.is_active,
    });
    if (e2) console.error(" ", u.email, "profile FAIL:", e2.message);
    else
      console.log(
        "  ✓",
        u.email.padEnd(20),
        u.id.slice(0, 8),
        "→",
        newId.slice(0, 8),
      );
  }
}

// ============ 3. Books ============
console.log("\n=== 3) Books ===");
const correctAvailability = new Map();
{
  const { data: books, error } = await oldSb.from("books").select("*");
  if (error) { console.error(error.message); process.exit(1); }
  for (const b of books) correctAvailability.set(b.id, b.available_quantity);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < books.length; i += BATCH) {
    const slice = books.slice(i, i + BATCH);
    const { error, data } = await newSb.from("books").insert(slice).select("id");
    if (error) {
      console.error(`  batch ${i}-${i + slice.length} FAIL:`, error.message);
    } else {
      inserted += data?.length || 0;
      console.log(`  ✓ batch ${i}-${i + slice.length}: ${data?.length || 0} inserted`);
    }
  }
  console.log(`  TOTAL: ${inserted}/${books.length}`);
}

// ============ 4. Rentals ============
console.log("\n=== 4) Rentals ===");
{
  const { data: rentals, error } = await oldSb.from("rentals").select("*");
  if (error) { console.error(error.message); process.exit(1); }

  for (const r of rentals) {
    const newUserId = userIdMap.get(r.user_id);
    if (!newUserId) {
      console.error("  skip rental", r.id, "- no user mapping");
      continue;
    }
    const remapped = { ...r, user_id: newUserId };
    const { error } = await newSb.from("rentals").insert(remapped);
    if (error) console.error("  rental", r.id.slice(0, 8), "FAIL:", error.message);
    else console.log("  ✓ rental", r.id.slice(0, 8), "status=" + r.status);
  }
}

// ============ 5. Fix books.available_quantity ============
console.log("\n=== 5) Fix books.available_quantity (트리거 보정) ===");
{
  let fixed = 0;
  for (const [bookId, qty] of correctAvailability) {
    const { data: cur } = await newSb
      .from("books")
      .select("available_quantity")
      .eq("id", bookId)
      .maybeSingle();
    if (cur && cur.available_quantity !== qty) {
      const { error } = await newSb
        .from("books")
        .update({ available_quantity: qty })
        .eq("id", bookId);
      if (error) console.error("  fix", bookId.slice(0, 8), "FAIL:", error.message);
      else fixed++;
    }
  }
  console.log(`  fixed: ${fixed} rows`);
}

// ============ 6. Mileage history ============
console.log("\n=== 6) Mileage history ===");
{
  const { data: history, error } = await oldSb
    .from("mileage_history")
    .select("*");
  if (error) { console.error(error.message); process.exit(1); }

  for (const h of history) {
    const newUserId = userIdMap.get(h.user_id);
    if (!newUserId) {
      console.error("  skip mileage", h.id, "- no user mapping");
      continue;
    }
    const remapped = { ...h, user_id: newUserId };
    const { error } = await newSb.from("mileage_history").insert(remapped);
    if (error) console.error("  mileage", h.id.slice(0, 8), "FAIL:", error.message);
    else console.log("  ✓ mileage", h.id.slice(0, 8), `${h.points}pt`);
  }
}

console.log("\n=== Migration complete ===");
console.log("다음: .env.local 을 NEW creds로 교체 후 npm run types:gen 실행");
