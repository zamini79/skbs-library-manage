// Google Books API helper — 책 표지 URL 조회 (무인증, 일 1000 limit)
//
// 사용처:
//   - POST /api/admin/books 인서트 직후 자동 호출
//   - scripts/fetch-covers.mjs 백필 (별도 구현)
//
// 반환: HTTPS-upgraded URL 또는 null

export async function fetchGoogleBookCover({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!title) return null;

  // 다중 저자는 첫 번째만 사용 (Google Books가 부분 매칭 더 잘 함)
  const firstAuthor = author?.split(/[,/]/)[0]?.trim() ?? "";
  const qParts = [`intitle:${title}`];
  if (firstAuthor) qParts.push(`inauthor:${firstAuthor}`);
  const q = qParts.join("+");

  const params = new URLSearchParams({
    q,
    maxResults: "1",
    printType: "books",
  });
  // 무인증 quota는 0이라 API key 필수. 없으면 호출 자체를 스킵.
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;
  params.set("key", apiKey);
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          imageLinks?: {
            extraLarge?: string;
            large?: string;
            medium?: string;
            small?: string;
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };

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

    // HTTP → HTTPS (mixed content 회피)
    return String(raw).replace(/^http:/, "https:");
  } catch {
    return null;
  }
}
