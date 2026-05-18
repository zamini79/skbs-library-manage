// 책 표지 백필 스크립트 — Google Books + Kakao Book Search 로 cover_url_external 채움
//
// Usage:
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs                       (전체, google→kakao)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --limit 20            (테스트)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --dry-run             (조회만)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --refresh             (이미 있는 것도 재조회)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --source kakao        (kakao만 시도 — 미매칭 보강용)
//   dotenv -e .env.local -- node scripts/fetch-covers.mjs --source google       (google만 시도)
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const refresh = args.includes("--refresh");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null;
const sourceIdx = args.indexOf("--source");
const source = sourceIdx >= 0 ? args[sourceIdx + 1] : "auto"; // auto | google | kakao
const useGoogle = source === "auto" || source === "google";
const useKakao = source === "auto" || source === "kakao";

async function fetchGoogle(title, author) {
  if (!process.env.GOOGLE_BOOKS_API_KEY) return null;
  const firstAuthor = (author || "").split(/[,/]/)[0].trim();
  const qParts = [`intitle:${title}`];
  if (firstAuthor) qParts.push(`inauthor:${firstAuthor}`);
  const params = new URLSearchParams({
    q: qParts.join("+"),
    maxResults: "1",
    printType: "books",
    key: process.env.GOOGLE_BOOKS_API_KEY,
  });
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

async function fetchKakao(title, author) {
  if (!process.env.KAKAO_REST_API_KEY) return null;
  const params = new URLSearchParams({
    query: title,
    target: "title",
    size: "5",
  });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://dapi.kakao.com/v3/search/book?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const docs = data?.documents ?? [];
    if (docs.length === 0) return null;

    const firstAuthor = (author || "").split(/[,/]/)[0].trim();
    if (firstAuthor) {
      const matched = docs.find((d) =>
        d.authors?.some(
          (a) => a.includes(firstAuthor) || firstAuthor.includes(a),
        ),
      );
      const url = matched?.thumbnail;
      if (!url) return null;
      return url.startsWith("//") ? `https:${url}` : url;
    }
    const url = docs[0]?.thumbnail;
    if (!url) return null;
    return url.startsWith("//") ? `https:${url}` : url;
  } catch {
    return null;
  }
}

async function fetchCover(title, author) {
  if (useGoogle) {
    const r = await fetchGoogle(title, author);
    if (r) return { url: r, source: "google" };
  }
  if (useKakao) {
    const r = await fetchKakao(title, author);
    if (r) return { url: r, source: "kakao" };
  }
  return null;
}

async function main() {
  if (useGoogle && !process.env.GOOGLE_BOOKS_API_KEY) {
    console.error("❌ GOOGLE_BOOKS_API_KEY 환경변수가 없습니다.");
    process.exit(1);
  }
  if (useKakao && !process.env.KAKAO_REST_API_KEY) {
    console.error("❌ KAKAO_REST_API_KEY 환경변수가 없습니다.");
    process.exit(1);
  }
  console.log(`Sources: ${useGoogle ? "Google" : ""}${useGoogle && useKakao ? " → " : ""}${useKakao ? "Kakao" : ""}`);

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
  const bySource = { google: 0, kakao: 0 };

  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const result = await fetchCover(b.title, b.author);
    if (result) {
      found++;
      bySource[result.source]++;
      if (!dryRun) {
        const { error: updErr } = await sb
          .from("books")
          .update({ cover_url_external: result.url })
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
        `  [${i + 1}/${books.length}] found=${found} (g:${bySource.google}, k:${bySource.kakao}), missed=${missed}${failed ? `, failed=${failed}` : ""}`,
      );
    }

    // 5 req/sec
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Found:  ${found} (Google: ${bySource.google}, Kakao: ${bySource.kakao})`);
  console.log(`Missed: ${missed}`);
  if (failed) console.log(`Failed (DB update): ${failed}`);
  if (dryRun) console.log(`(DRY RUN — no DB writes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
