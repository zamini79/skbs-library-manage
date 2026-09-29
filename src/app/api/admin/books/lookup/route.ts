// GET /api/admin/books/lookup?q=제목 — 신규 등록 폼의 제목 검색 (master 권한)
// Kakao 책 검색 → 결과가 없거나 실패하면 Naver 로 폴백. 후보 목록만 돌려주고 저장은 하지 않는다.
import { NextResponse } from "next/server";
import { getMasterOrError } from "@/lib/auth/admin-auth";
import { searchKakaoBooks } from "@/lib/kakao-books";
import { searchNaverBooks } from "@/lib/naver-books";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const adminOrErr = await getMasterOrError();
  if (adminOrErr instanceof NextResponse) return adminOrErr;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q || q.length > 200) {
    return NextResponse.json({ ok: false, error: "INVALID_QUERY" }, { status: 400 });
  }

  const kakao = await searchKakaoBooks(q);
  if (kakao && kakao.length > 0) {
    return NextResponse.json({ ok: true, results: kakao });
  }
  const naver = await searchNaverBooks(q);
  if (kakao === null && naver === null) {
    return NextResponse.json({ ok: false, error: "LOOKUP_FAILED" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, results: naver ?? [] });
}
