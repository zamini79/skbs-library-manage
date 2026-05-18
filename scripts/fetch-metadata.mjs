// 책 메타데이터(isbn + description) 통합 백필 스크립트
//
// 대상: isbn IS NULL 또는 description IS NULL 인 책
// 체인: Kakao → Naver → Google 순으로 빈 필드 채움
//   - isbn: 첫 매칭이 없으면 다음 소스 시도
//   - description: kakao 우선, 없으면 naver, 없으면 google
//
// Usage:
//   dotenv -e .env.local -- node scripts/fetch-metadata.mjs                 (전체)
//   dotenv -e .env.local -- node scripts/fetch-metadata.mjs --limit 20      (테스트)
//   dotenv -e .env.local -- node scripts/fetch-metadata.mjs --dry-run       (조회만)
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null;

function pickIsbn13Spaced(raw) {
  if (!raw) return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.find((p) => p.length === 13) || parts[0] || null;
}

function stripTags(s) {
  return (s || "").replace(/<[^>]+>/g, "").trim();
}

async function fetchKakao(title, author) {
  if (!process.env.KAKAO_REST_API_KEY) return null;
  const params = new URLSearchParams({ query: title, target: "title", size: "5" });
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
    let pick = null;
    if (firstAuthor) {
      pick = docs.find((d) =>
        d.authors?.some((a) => a.includes(firstAuthor) || firstAuthor.includes(a)),
      );
    }
    if (!pick) pick = docs[0];
    return {
      isbn: pickIsbn13Spaced(pick.isbn),
      description: pick.contents?.trim() || null,
    };
  } catch {
    return null;
  }
}

async function fetchNaver(title, author) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) return null;
  const params = new URLSearchParams({ query: title, display: "5", sort: "sim" });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://openapi.naver.com/v1/search/book.json?${params}`, {
      signal: controller.signal,
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.items ?? [];
    if (items.length === 0) return null;

    const normalize = (s) => stripTags(s).replace(/\s+/g, "").toLowerCase();
    const ourTitleNorm = normalize(title);
    const firstAuthor = (author || "").split(/[,/.;]/)[0].trim();
    let pick = null;
    if (firstAuthor) {
      pick = items.find((d) => {
        const naverAuthors = (d.author || "").split(/[\^,;.]/);
        return naverAuthors.some((a) => {
          const t = a.trim();
          return t && (t.includes(firstAuthor) || firstAuthor.includes(t));
        });
      });
    }
    if (!pick) {
      pick = items.find((d) => {
        if (!d.title) return false;
        const naverNorm = normalize(d.title);
        return (
          naverNorm === ourTitleNorm ||
          naverNorm.startsWith(ourTitleNorm) ||
          ourTitleNorm.startsWith(naverNorm)
        );
      });
    }
    if (!pick) return null;
    return {
      isbn: pickIsbn13Spaced(pick.isbn),
      description: pick.description ? stripTags(pick.description) || null : null,
    };
  } catch {
    return null;
  }
}

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
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const v = data.items?.[0]?.volumeInfo;
    if (!v) return null;
    const ids = v.industryIdentifiers || [];
    const isbn = ids.find((x) => x.type === "ISBN_13")?.identifier
      || ids.find((x) => x.type === "ISBN_10")?.identifier
      || null;
    return { isbn, description: v.description?.trim() || null };
  } catch {
    return null;
  }
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // isbn 또는 description 이 없는 책 — OR 조건
  let query = sb
    .from("books")
    .select("id, title, author, isbn, description")
    .or("isbn.is.null,description.is.null");
  if (limit) query = query.limit(limit);

  const { data: books, error } = await query;
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }
  console.log(`Target: ${books.length} books (dry-run=${dryRun}${limit ? `, limit=${limit}` : ""})`);

  const fromSource = { isbn: { kakao: 0, naver: 0, google: 0 }, desc: { kakao: 0, naver: 0, google: 0 } };
  let updatedRows = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    let needIsbn = !b.isbn;
    let needDesc = !b.description;
    let newIsbn = null;
    let newDesc = null;
    let isbnSrc = null;
    let descSrc = null;

    // 1) Kakao
    if (needIsbn || needDesc) {
      const k = await fetchKakao(b.title, b.author);
      if (k) {
        if (needIsbn && k.isbn) { newIsbn = k.isbn; isbnSrc = "kakao"; needIsbn = false; }
        if (needDesc && k.description) { newDesc = k.description; descSrc = "kakao"; needDesc = false; }
      }
    }
    // 2) Naver
    if (needIsbn || needDesc) {
      const n = await fetchNaver(b.title, b.author);
      if (n) {
        if (needIsbn && n.isbn) { newIsbn = n.isbn; isbnSrc = "naver"; needIsbn = false; }
        if (needDesc && n.description) { newDesc = n.description; descSrc = "naver"; needDesc = false; }
      }
    }
    // 3) Google
    if (needIsbn || needDesc) {
      const g = await fetchGoogle(b.title, b.author);
      if (g) {
        if (needIsbn && g.isbn) { newIsbn = g.isbn; isbnSrc = "google"; needIsbn = false; }
        if (needDesc && g.description) { newDesc = g.description; descSrc = "google"; needDesc = false; }
      }
    }

    const updates = {};
    if (newIsbn) {
      updates.isbn = newIsbn;
      fromSource.isbn[isbnSrc]++;
    }
    if (newDesc) {
      updates.description = newDesc;
      fromSource.desc[descSrc]++;
    }
    if (Object.keys(updates).length > 0 && !dryRun) {
      const { error: e } = await sb.from("books").update(updates).eq("id", b.id);
      if (e) {
        failed++;
        console.error(`  [${i + 1}] FAIL:`, b.title, e.message);
      } else {
        updatedRows++;
      }
    } else if (Object.keys(updates).length > 0) {
      updatedRows++;
    }

    if ((i + 1) % 25 === 0 || i + 1 === books.length) {
      console.log(
        `  [${i + 1}/${books.length}] updated=${updatedRows} (isbn k:${fromSource.isbn.kakao} n:${fromSource.isbn.naver} g:${fromSource.isbn.google} / desc k:${fromSource.desc.kakao} n:${fromSource.desc.naver} g:${fromSource.desc.google})`,
      );
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated rows: ${updatedRows}`);
  console.log(`ISBN filled by: kakao=${fromSource.isbn.kakao}, naver=${fromSource.isbn.naver}, google=${fromSource.isbn.google}`);
  console.log(`Description filled by: kakao=${fromSource.desc.kakao}, naver=${fromSource.desc.naver}, google=${fromSource.desc.google}`);
  if (failed) console.log(`Failed: ${failed}`);
  if (dryRun) console.log(`(DRY RUN — no DB writes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
