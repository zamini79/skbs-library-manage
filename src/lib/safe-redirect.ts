// 오픈 리디렉트 방어: 절대 경로(/path)만 허용, 외부 URL 차단.
// 차단 대상:
//   - "//evil.com"     (protocol-relative URL)
//   - "https://evil"   (절대 URL)
//   - "javascript:..." (스킴)
//   - "\\evil.com"     (Chrome이 / 로 정규화)
//   - 빈 문자열, null
export function safeRedirect(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
