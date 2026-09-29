// Naver Book Search API helper
// API: https://developers.naver.com/docs/serviceapi/search/book/book.md
// 한도: 25,000/일 (앱당)

import type { BookSearchCandidate } from "./kakao-books";

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/book.json";

export type NaverBookMetadata = {
  cover: string | null;
  isbn: string | null;
  description: string | null;
};

function pickIsbn13(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.find((p) => p.length === 13) ?? parts[0] ?? null;
}

function stripTags(s: string): string {
  return (s || "").replace(/<[^>]+>/g, "").trim();
}

export async function fetchNaverBookMetadata({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<NaverBookMetadata> {
  const empty: NaverBookMetadata = { cover: null, isbn: null, description: null };
  if (!title) return empty;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return empty;

  const params = new URLSearchParams({
    query: title,
    display: "5",
    sort: "sim",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${NAVER_ENDPOINT}?${params}`, {
      signal: controller.signal,
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return empty;

    const data = (await res.json()) as {
      items?: Array<{
        image?: string;
        author?: string;
        title?: string;
        isbn?: string;
        description?: string;
      }>;
    };
    const items = data?.items ?? [];
    if (items.length === 0) return empty;

    const normalize = (s: string) => stripTags(s).replace(/\s+/g, "").toLowerCase();
    const ourTitleNorm = normalize(title);

    // 1) 저자 매칭
    const firstAuthor = author?.split(/[,/.;]/)[0]?.trim();
    let pick: (typeof items)[number] | undefined;
    if (firstAuthor) {
      pick = items.find((d) => {
        const naverAuthors = (d.author || "").split(/[\^,;.]/);
        return naverAuthors.some((a) => {
          const t = a.trim();
          return t && (t.includes(firstAuthor) || firstAuthor.includes(t));
        });
      });
    }

    // 2) 제목 매칭 폴백
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

    if (!pick) return empty;
    return {
      cover: pick.image || null,
      isbn: pickIsbn13(pick.isbn),
      description: pick.description ? stripTags(pick.description) || null : null,
    };
  } catch {
    return empty;
  }
}

// 하위 호환
export async function fetchNaverBookCover(opts: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  const m = await fetchNaverBookMetadata(opts);
  return m.cover;
}

// ── 신규 등록 폼의 제목 검색용 (Kakao 결과가 없을 때 폴백) ──

export async function searchNaverBooks(
  query: string,
  { size = 10, timeoutMs = 5000 }: { size?: number; timeoutMs?: number } = {},
): Promise<BookSearchCandidate[] | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret || !query) return null;

  const params = new URLSearchParams({ query, display: String(size), sort: "sim" });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${NAVER_ENDPOINT}?${params}`, {
      signal: controller.signal,
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        title?: string;
        author?: string;
        publisher?: string;
        isbn?: string;
        discount?: string;
        image?: string;
        pubdate?: string;
      }>;
    };
    return (data.items ?? [])
      .filter((d) => d.title)
      .map((d) => {
        const price = Number(d.discount);
        const p = d.pubdate ?? "";
        return {
          title: stripTags(d.title!),
          author: stripTags(d.author ?? "").split("^").join(", "),
          publisher: stripTags(d.publisher ?? ""),
          isbn: pickIsbn13(d.isbn),
          price: Number.isFinite(price) && price > 0 ? price : null,
          cover: d.image || null,
          published: /^\d{8}$/.test(p) ? `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6)}` : null,
          source: "naver" as const,
        };
      });
  } catch {
    return null;
  }
}
