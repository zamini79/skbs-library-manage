// Google Books API helper
// 무인증 quota는 0이므로 GOOGLE_BOOKS_API_KEY 필수

export type GoogleBookMetadata = {
  cover: string | null;
  isbn: string | null;
  description: string | null;
};

function pickIsbn13(
  ids: Array<{ type: string; identifier: string }> | undefined,
): string | null {
  if (!ids) return null;
  const i13 = ids.find((x) => x.type === "ISBN_13");
  if (i13) return i13.identifier;
  const i10 = ids.find((x) => x.type === "ISBN_10");
  return i10?.identifier ?? null;
}

export async function fetchGoogleBookMetadata({
  title,
  author,
  timeoutMs = 5000,
}: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<GoogleBookMetadata> {
  const empty: GoogleBookMetadata = { cover: null, isbn: null, description: null };
  if (!title) return empty;

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return empty;

  const firstAuthor = author?.split(/[,/]/)[0]?.trim() ?? "";
  const qParts = [`intitle:${title}`];
  if (firstAuthor) qParts.push(`inauthor:${firstAuthor}`);

  const params = new URLSearchParams({
    q: qParts.join("+"),
    maxResults: "1",
    printType: "books",
    key: apiKey,
  });
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return empty;

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
          industryIdentifiers?: Array<{ type: string; identifier: string }>;
          description?: string;
        };
      }>;
    };
    const v = data.items?.[0]?.volumeInfo;
    if (!v) return empty;

    const links = v.imageLinks;
    const raw = links
      ? links.medium ||
        links.small ||
        links.thumbnail ||
        links.smallThumbnail ||
        links.large ||
        links.extraLarge
      : null;
    const cover = raw ? String(raw).replace(/^http:/, "https:") : null;

    return {
      cover,
      isbn: pickIsbn13(v.industryIdentifiers),
      description: v.description?.trim() || null,
    };
  } catch {
    return empty;
  }
}

// 하위 호환
export async function fetchGoogleBookCover(opts: {
  title: string;
  author?: string;
  timeoutMs?: number;
}): Promise<string | null> {
  const m = await fetchGoogleBookMetadata(opts);
  return m.cover;
}
