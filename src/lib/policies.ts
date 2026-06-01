export const RENTAL_POLICY = {
  RENTAL_PERIOD_DAYS: 14,
  MAX_MONTHLY_RENTALS: 2,
  MAX_CONCURRENT_HOLDINGS: 2,
  ALLOW_EXTENSION: false,
  ALLOW_RENTAL_WHEN_OVERDUE: false,
  EMAIL_DOMAIN: "@sk.com",
} as const;

export const MILEAGE_POLICY = {
  ON_TIME_RETURN: 10,
  OVERDUE_RETURN: -5,
} as const;

// 레거시(기존 대출 정보 보유) 회원이 신규 가입 시 부여되는 공통 임시 비밀번호.
// must_change_password=true 계정에만 사용되며, 로그인 직후 변경을 강제한다.
export const LEGACY_TEMP_PASSWORD = "qwer1234!@#$";

export const BOOK_CATEGORIES = [
  "철학/종교/인문",
  "사회과학",
  "문학",
  "역사/여행",
] as const;

export const ADMIN_ROLES = ["master", "book"] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];
