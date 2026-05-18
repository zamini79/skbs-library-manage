// Naver Book Search API helper — 한국 출판사 공식 표지 제공 (Google/Kakao 다음 3순위 폴백)
//
// API: https://developers.naver.com/docs/serviceapi/search/book/book.md
// 한도: 25,000/일 (앱당)

const NAVER_ENDPOINT = "https://openapi.naver.com/v1/search/book.json";

export async function fetchNaverBookCover({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!title) return null;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

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
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{ image?: string; author?: string; title?: string }>;
    };
    const items = data?.items ?? [];
    if (items.length === 0) return null;

    const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    const normalize = (s: string) => stripTags(s).replace(/\s+/g, "").toLowerCase();
    const ourTitleNorm = normalize(title);

    // 1) 저자명 매칭 우선 (구분자: . / , ; ^ 공백 모두)
    const firstAuthor = author?.split(/[,/.;]/)[0]?.trim();
    if (firstAuthor) {
      const byAuthor = items.find((d) => {
        const naverAuthors = (d.author || "").split(/[\^,;.]/);
        return naverAuthors.some((a) => {
          const t = a.trim();
          return t && (t.includes(firstAuthor) || firstAuthor.includes(t));
        });
      });
      if (byAuthor?.image) return byAuthor.image;
    }

    // 2) 제목 정확/포함 매칭 (한글 표기 차이로 author 매칭 실패하는 경우 대비)
    const byTitle = items.find((d) => {
      if (!d.title) return false;
      const naverNorm = normalize(d.title);
      return naverNorm === ourTitleNorm || naverNorm.startsWith(ourTitleNorm) || ourTitleNorm.startsWith(naverNorm);
    });
    if (byTitle?.image) return byTitle.image;

    return null;
  } catch {
    return null;
  }
}
