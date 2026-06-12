// 이메일 OTP 가입 키트 — 프로젝트별 설정. 이 파일 한 곳만 고치면 됩니다.
// 복사 위치: src/lib/auth-config.ts

export type ProfileField = {
  /** profileTable 의 컬럼명 (= 폼 input name) */
  key: string;
  /** 화면 라벨 */
  label: string;
  /** 필수 여부 */
  required?: boolean;
  /** input type (기본 text) */
  type?: "text" | "tel" | "number";
  placeholder?: string;
};

export const AUTH_CONFIG = {
  /** 서비스명 (제목/안내문에 사용) */
  appName: "내 서비스",

  /**
   * 가입 허용 이메일 도메인. 예: "@sk.com"
   * 제한이 없으면 null.
   */
  allowedEmailDomain: null as string | null,

  /** 가입 완료 시 프로필을 INSERT 할 테이블 (auth.users.id 와 1:1) */
  profileTable: "users",

  /**
   * complete 폼에서 추가로 입력받아 profileTable 에 저장할 필드.
   * key 는 테이블 컬럼명과 동일해야 함. (email/id 는 코드가 자동 처리)
   */
  profileFields: [
    { key: "name", label: "이름", required: true, placeholder: "홍길동" },
    // { key: "employee_no", label: "사번", required: true },
    // { key: "department", label: "부서", required: false },
  ] as ProfileField[],

  /** 리다이렉트 경로 */
  routes: {
    signup: "/signup",
    verify: "/signup/verify",
    complete: "/signup/complete",
    login: "/login",
    afterComplete: "/", // 가입 완료 후
    afterLogin: "/", // 로그인 후
  },

  /** 비밀번호 규칙 (complete/재설정 폼 검증) */
  password: {
    minLength: 8,
    requireLetter: true,
    requireNumber: true,
    requireSpecial: true,
  },
} as const;

/** 이메일 도메인 검증 (allowedEmailDomain 이 null 이면 항상 통과) */
export function isAllowedEmail(email: string): boolean {
  const d = AUTH_CONFIG.allowedEmailDomain;
  if (!d) return true;
  return email.toLowerCase().endsWith(d.toLowerCase());
}
