// Kakao Book Search API helper
// API: https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide
// 한도: 30,000/일 (앱당)

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v3/search/book";

// Kakao thumb는 정사각형 캔버스라 책 비율 왜곡. fname 안의 daumcdn 원본 URL 추출 + HTTPS.
function extractKakaoOriginal(url: string): string {
  if (!url || !url.includes("kakaocdn.net/thumb/")) return url;
  const m = url.match(/[?&]fname=([^&]+)/);
  if (!m) return url;
  try {
    return decodeURIComponent(m[1]).replace(/^http:\/\//, "https://");
  } catch {
    return url;
  }
}

// Kakao isbn 필드는 "ISBN10 ISBN13" 형태. ISBN13 우선 추출.
function pickIsbn13(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.find((p) => p.length === 13) ?? parts[0] ?? null;
}

export type KakaoBookMetadata = {
  cover: string | null;
  isbn: string | null;
  description: string | null;
};

export async function fetchKakaoBookMetadata({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<KakaoBookMetadata> {
  const empty: KakaoBookMetadata = { cover: null, isbn: null, description: null };
  if (!title) return empty;

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return empty;

  const params = new URLSearchParams({
    query: title,
    target: "title",
    size: "5",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${KAKAO_ENDPOINT}?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    clearTimeout(timer);
    if (!res.ok) return empty;

    const data = (await res.json()) as {
      documents?: Array<{
        thumbnail?: string;
        authors?: string[];
        isbn?: string;
        contents?: string;
      }>;
    };
    const docs = data?.documents ?? [];
    if (docs.length === 0) return empty;

    // 저자 매칭 (엄격)
    const firstAuthor = author?.split(/[,/]/)[0]?.trim();
    let pick = null;
    if (firstAuthor) {
      pick =
        docs.find((d) =>
          d.authors?.some(
            (a) => a.includes(firstAuthor) || firstAuthor.includes(a),
          ),
        ) ?? null;
    } else {
      pick = docs[0] ?? null;
    }

    if (!pick) return empty;
    const cover = pick.thumbnail
      ? extractKakaoOriginal(
          pick.thumbnail.startsWith("//") ? `https:${pick.thumbnail}` : pick.thumbnail,
        )
      : null;
    return {
      cover,
      isbn: pickIsbn13(pick.isbn),
      description: pick.contents?.trim() || null,
    };
  } catch {
    return empty;
  }
}

// 표지만 필요한 호출자를 위한 하위 호환 함수
export async function fetchKakaoBookCover(opts: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  const m = await fetchKakaoBookMetadata(opts);
  return m.cover;
}
