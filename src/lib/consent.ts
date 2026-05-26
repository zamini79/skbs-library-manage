// 개인정보 동의 라이프사이클 유틸
//
// - 동의 후 365일 보유 → 만료 시 회원 정보 완전 삭제
// - 만료 14일 전부터 로그인 시 알림 배너 + 재동의 유도

export const CONSENT_DURATION_DAYS = 365;
export const CONSENT_WARNING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getExpiresAt(consentGivenAt: string | Date): Date {
  const t = new Date(consentGivenAt).getTime();
  return new Date(t + CONSENT_DURATION_DAYS * DAY_MS);
}

/** 만료까지 남은 일수 (음수면 이미 만료). */
export function getDaysUntilExpiry(consentGivenAt: string | Date): number {
  const expires = getExpiresAt(consentGivenAt).getTime();
  return Math.ceil((expires - Date.now()) / DAY_MS);
}

export function isExpired(consentGivenAt: string | Date): boolean {
  return getDaysUntilExpiry(consentGivenAt) <= 0;
}

export function isExpiringSoon(consentGivenAt: string | Date): boolean {
  const days = getDaysUntilExpiry(consentGivenAt);
  return days > 0 && days <= CONSENT_WARNING_DAYS;
}
