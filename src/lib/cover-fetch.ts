// 신규 도서 INSERT 후 외부 메타 조회 → cover_url_external / isbn / description 채우기.
// Kakao → Naver → Google 순으로 빈 칸만 채우는 fallback 체인.
// 표시 우선순위는 cover_url(수동) > cover_url_external(자동). 여기는 후자만 갱신.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { fetchGoogleBookMetadata } from "./google-books";
import { fetchKakaoBookMetadata } from "./kakao-books";
import { fetchNaverBookMetadata } from "./naver-books";

export type CoverSource = "kakao" | "naver" | "google" | null;

export type CoverFetchResult = {
  cover: string | null;
  coverSource: CoverSource;
  isbn: string | null;
  description: string | null;
};

type Client = SupabaseClient<Database>;

export async function fetchAndStoreCover(
  supabase: Client,
  bookId: string,
  title: string,
  author: string,
  initialIsbn: string | null = null,
): Promise<CoverFetchResult> {
  let cover: string | null = null;
  let isbn: string | null = initialIsbn;
  let description: string | null = null;
  let coverSource: CoverSource = null;

  const k = await fetchKakaoBookMetadata({ title, author });
  if (k.cover) {
    cover = k.cover;
    coverSource = "kakao";
  }
  if (k.isbn && !isbn) isbn = k.isbn;
  if (k.description) description = k.description;

  if (!cover || !isbn || !description) {
    const n = await fetchNaverBookMetadata({ title, author });
    if (!cover && n.cover) {
      cover = n.cover;
      coverSource = "naver";
    }
    if (!isbn && n.isbn) isbn = n.isbn;
    if (!description && n.description) description = n.description;
  }
  if (!cover || !isbn) {
    const g = await fetchGoogleBookMetadata({ title, author });
    if (!cover && g.cover) {
      cover = g.cover;
      coverSource = "google";
    }
    if (!isbn && g.isbn) isbn = g.isbn;
  }

  const updates: {
    cover_url_external?: string;
    isbn?: string;
    description?: string;
  } = {};
  if (cover) updates.cover_url_external = cover;
  if (isbn && isbn !== initialIsbn) updates.isbn = isbn;
  if (description) updates.description = description;

  if (Object.keys(updates).length > 0) {
    await supabase.from("books").update(updates).eq("id", bookId);
  }
  return { cover, coverSource, isbn, description };
}
