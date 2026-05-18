// 책 표지 백필 스크립트 — Google Books API로 cover_url_external 일괄 채움
//
// Usage:
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs               (전체)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --limit 20    (테스트)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --dry-run     (조회만, 업데이트 X)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --refresh     (이미 있는 것도 재조회)
//
// 정책:
//   - 기본: cover_url IS NULL AND cover_url_external IS NULL 인 책만 대상
//   - --refresh: cover_url_external만 비어있어도 (cover_url 무관) 재조회
//   - 5 req/sec 페이싱 (Google Books 무인증 1000/day 한도 안에서 안전)
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const refresh = args.includes("--refresh");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null;

async function fetchCover(title, author) {
  const firstAuthor = (author || "").split(/[,/]/)[0].trim();
  const qParts = [`intitle:${title}`];
  if (firstAuthor) qParts.push(`inauthor:${firstAuthor}`);
  const q = qParts.join("+");
  const params = new URLSearchParams({
    q,
    maxResults: "1",
    printType: "books",
  });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const links = data.items?.[0]?.volumeInfo?.imageLinks;
    if (!links) return null;
    const raw =
      links.medium ||
      links.small ||
      links.thumbnail ||
      links.smallThumbnail ||
      links.large ||
      links.extraLarge;
    if (!raw) return null;
    return String(raw).replace(/^http:/, "https:");
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    console.error(
      "❌ GOOGLE_BOOKS_API_KEY 환경변수가 없습니다. .env.local에 추가해주세요.",
    );
    console.error("   발급: https://console.cloud.google.com → API & Services → Library → 'Books API' 활성화 → Credentials → API key");
    process.exit(1);
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let query = sb.from("books").select("id, title, author").is("cover_url_external", null);
  if (!refresh) {
    query = query.is("cover_url", null);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data: books, error } = await query;
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  console.log(
    `Target: ${books.length} books (dry-run=${dryRun}, refresh=${refresh}${limit ? `, limit=${limit}` : ""})`,
  );

  let found = 0;
  let missed = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const cover = await fetchCover(b.title, b.author);
    if (cover) {
      found++;
      if (!dryRun) {
        const { error: updErr } = await sb
          .from("books")
          .update({ cover_url_external: cover })
          .eq("id", b.id);
        if (updErr) {
          failed++;
          console.error(`  [${i + 1}] FAIL update: ${b.title} - ${updErr.message}`);
        }
      }
    } else {
      missed++;
    }

    if ((i + 1) % 25 === 0 || i + 1 === books.length) {
      console.log(
        `  [${i + 1}/${books.length}] found=${found}, missed=${missed}${failed ? `, failed=${failed}` : ""}`,
      );
    }

    // 5 req/sec
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Found:  ${found}`);
  console.log(`Missed: ${missed}`);
  if (failed) console.log(`Failed (DB update): ${failed}`);
  if (dryRun) console.log(`(DRY RUN — no DB writes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
