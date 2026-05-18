// Kakao Book Search API helper — 한국 책 커버리지 보강용 (Google Books 폴백)
//
// API: https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide
// 한도: 30,000/일 (앱당), 썸네일 80×110

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v3/search/book";

// Kakao CDN은 정사각형 사이즈만 허용 (R200x200, R400x400, R600x600, R800x800, R1080x1080).
// R600x600 = 약 5x 해상도 (~55KB), 카드 표시용 충분.
function upsizeKakaoThumbnail(url: string): string {
  if (!url || !url.includes("kakaocdn.net/thumb/")) return url;
  return url.replace(/\/thumb\/R\d+x\d+(?:\.q\d+)?\//, "/thumb/R600x600.q90/");
}

export async function fetchKakaoBookCover({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!title) return null;

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return null;

  // 제목 기반 검색 (저자명은 결과에서 필터링)
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
    if (!res.ok) return null;

    const data = (await res.json()) as {
      documents?: Array<{ thumbnail?: string; authors?: string[] }>;
    };
    const docs = data?.documents ?? [];
    if (docs.length === 0) return null;

    const normalizeUrl = (u: string) => {
      const https = u.startsWith("//") ? `https:${u}` : u;
      return upsizeKakaoThumbnail(https);
    };

    // 저자명 매칭 (엄격) — 잘못된 책 표지 방지
    const firstAuthor = author?.split(/[,/]/)[0]?.trim();
    if (firstAuthor) {
      const matched = docs.find((d) =>
        d.authors?.some(
          (a) => a.includes(firstAuthor) || firstAuthor.includes(a),
        ),
      );
      const url = matched?.thumbnail;
      if (!url) return null;
      return normalizeUrl(url);
    }

    // 저자 정보 없으면 첫 번째 결과 사용
    const url = docs[0]?.thumbnail;
    if (!url) return null;
    return normalizeUrl(url);
  } catch {
    return null;
  }
}
