// 추측하기 쉬운 정보(연속 숫자, 동일 문자 반복, 아이디·사번)를 활용한 취약
// 비밀번호 사용을 제한한다. (보안요구사항 체크리스트 Web-App #3)
export type PasswordGuessableContext = {
  email?: string | null;
  employeeNo?: string | null;
};

const CONSECUTIVE_DIGIT_LEN = 3; // 연속된 숫자 N자리 이상 금지 (예: 123, 987)
const REPEATED_CHAR_LEN = 3; // 동일 문자 N개 이상 반복 금지 (예: aaa, 111)

function hasConsecutiveDigits(password: string, len = CONSECUTIVE_DIGIT_LEN): boolean {
  for (let i = 0; i + len <= password.length; i++) {
    const slice = password.slice(i, i + len);
    if (!/^\d+$/.test(slice)) continue;
    let ascending = true;
    let descending = true;
    for (let j = 1; j < slice.length; j++) {
      const diff = slice.charCodeAt(j) - slice.charCodeAt(j - 1);
      if (diff !== 1) ascending = false;
      if (diff !== -1) descending = false;
    }
    if (ascending || descending) return true;
  }
  return false;
}

function hasRepeatedChar(password: string, len = REPEATED_CHAR_LEN): boolean {
  for (let i = 0; i + len <= password.length; i++) {
    const slice = password.slice(i, i + len);
    if (slice.split("").every((c) => c === slice[0])) return true;
  }
  return false;
}

function includesToken(password: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const normalized = token.trim().toLowerCase();
  if (normalized.length < 3) return false;
  return password.toLowerCase().includes(normalized);
}

/** 비밀번호가 추측하기 쉬운 패턴을 포함하면 사용자에게 보여줄 에러 메시지를, 문제 없으면 null을 반환한다. */
export function findGuessablePasswordIssue(
  password: string,
  ctx: PasswordGuessableContext = {},
): string | null {
  if (hasConsecutiveDigits(password)) {
    return `연속된 숫자를 ${CONSECUTIVE_DIGIT_LEN}자리 이상 사용할 수 없습니다.`;
  }
  if (hasRepeatedChar(password)) {
    return `동일한 문자를 ${REPEATED_CHAR_LEN}자 이상 반복할 수 없습니다.`;
  }
  const emailLocalPart = ctx.email?.split("@")[0];
  if (includesToken(password, emailLocalPart)) {
    return "비밀번호에 이메일 아이디를 포함할 수 없습니다.";
  }
  if (includesToken(password, ctx.employeeNo)) {
    return "비밀번호에 사번을 포함할 수 없습니다.";
  }
  return null;
}
