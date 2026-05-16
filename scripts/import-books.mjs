// 도서 일괄 업로드 스크립트 (Day 2 임시 도구, Day 5 정식 UI 나오기 전까지 사용)
//
// Usage:
//   dotenv -e .env.local -- node scripts/import-books.mjs <path-to-xlsx>            (dry-run)
//   dotenv -e .env.local -- node scripts/import-books.mjs <path-to-xlsx> --insert   (실제 적재)
//
// 시트 '도서목록'에서 다음 컬럼을 읽음:
//   제목 *, 저자, 출판사 *, ISBN, 카테고리 *, 단가, 수량 *
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";
const { readFile, utils } = xlsx;

const VALID_CATEGORIES = [
  "철학/종교/인문",
  "사회과학",
  "음반",
  "문학",
  "역사/여행",
];

const filePath = process.argv[2];
const doInsert = process.argv.includes("--insert");

if (!filePath) {
  console.error("Usage: node scripts/import-books.mjs <path-to-xlsx> [--insert]");
  process.exit(1);
}

const wb = readFile(filePath);
if (!wb.SheetNames.includes("도서목록")) {
  console.error("시트 '도서목록'을 찾을 수 없습니다. 사용 가능한 시트:", wb.SheetNames);
  process.exit(1);
}
const rows = utils.sheet_to_json(wb.Sheets["도서목록"], { defval: null });

const valid = [];
const invalid = [];

const trim = (v) => (v == null ? "" : String(v).trim());

for (const [i, r] of rows.entries()) {
  const errors = [];
  const title = trim(r["제목 *"]);
  let author = trim(r["저자"]);
  // 백필: "먼나라 이웃나라" 시리즈 author 누락 보정
  if (!author && title.startsWith("먼나라 이웃나라")) {
    author = "이원복";
  }
  const publisher = trim(r["출판사 *"]);
  const isbnRaw = trim(r["ISBN"]);
  const isbn = isbnRaw || null;
  const category = trim(r["카테고리 *"]);
  const price = Number(r["단가"] ?? 0);
  const totalQty = Number(r["수량 *"] ?? 0);

  if (!title) errors.push("title 비어있음");
  if (!author) errors.push("author 비어있음");
  if (!publisher) errors.push("publisher 비어있음");
  if (!VALID_CATEGORIES.includes(category))
    errors.push(`category 잘못된 값: "${category}"`);
  if (!Number.isFinite(price) || price < 0)
    errors.push(`price 잘못된 값: ${price}`);
  if (!Number.isFinite(totalQty) || totalQty <= 0)
    errors.push(`total_quantity 잘못된 값: ${totalQty}`);

  if (errors.length > 0) {
    invalid.push({
      excelRow: i + 2, // 1행은 헤더
      sequence: r["순번"],
      title,
      errors,
    });
    continue;
  }

  valid.push({
    title,
    author,
    publisher,
    isbn,
    category,
    price: Math.trunc(price),
    total_quantity: Math.trunc(totalQty),
    available_quantity: Math.trunc(totalQty),
  });
}

console.log("=== Validation Summary ===");
console.log(`Total rows: ${rows.length}`);
console.log(`Valid:      ${valid.length}`);
console.log(`Invalid:    ${invalid.length}`);

// 카테고리별 분포
const distByCategory = valid.reduce((acc, b) => {
  acc[b.category] = (acc[b.category] || 0) + 1;
  return acc;
}, {});
console.log("\n=== Category distribution (valid) ===");
for (const cat of VALID_CATEGORIES) {
  console.log(`  ${cat.padEnd(14)} : ${distByCategory[cat] || 0}`);
}

if (invalid.length > 0) {
  console.log("\n=== Invalid rows (first 20) ===");
  invalid.slice(0, 20).forEach((r) => {
    console.log(
      `  Excel row ${r.excelRow} (순번 ${r.sequence}): "${r.title}" — ${r.errors.join(", ")}`
    );
  });
}

console.log("\n=== Preview (first 3 valid rows) ===");
valid.slice(0, 3).forEach((b, i) => {
  console.log(`${i + 1}. ${b.title} / ${b.author} / ${b.publisher} | ${b.category} | ${b.price.toLocaleString()}원 × ${b.total_quantity}`);
});

if (!doInsert) {
  console.log("\n[DRY RUN] --insert 플래그를 붙이면 실제로 DB에 적재합니다.");
  process.exit(0);
}

// === 실제 적재 ===
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH = 200;
let inserted = 0;
let failed = 0;
const failures = [];

for (let i = 0; i < valid.length; i += BATCH) {
  const slice = valid.slice(i, i + BATCH);
  const { data, error } = await supabase.from("books").insert(slice).select("id");
  if (error) {
    console.error(`  Batch ${i}-${i + slice.length} failed:`, error.message);
    failed += slice.length;
    failures.push({ start: i, end: i + slice.length, message: error.message });
  } else {
    inserted += data?.length || 0;
    console.log(`  Batch ${i}-${i + slice.length}: inserted ${data?.length || 0}`);
  }
}

console.log("\n=== Done ===");
console.log(`Inserted: ${inserted}`);
console.log(`Failed:   ${failed}`);
if (failures.length > 0) {
  console.log("\nFailure details:");
  failures.forEach((f) => console.log(`  ${f.start}-${f.end}: ${f.message}`));
  process.exit(1);
}
