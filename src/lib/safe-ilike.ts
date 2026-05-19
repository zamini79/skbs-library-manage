// PostgREST .or() / .ilike() 사용자 입력 sanitize.
// 제거 대상:
//   ", ( )      — PostgREST or() 구분자/그룹화
//   % _         — PostgreSQL LIKE 와일드카드 (남용 시 전체 스캔, DoS)
//   \           — 이스케이프 문자
// 길이는 100자로 절단.
const FORBIDDEN = /[,()%_\\]/g;
const MAX_LEN = 100;

export function safeIlike(q: string): string {
  return q.replace(FORBIDDEN, "").slice(0, MAX_LEN);
}
