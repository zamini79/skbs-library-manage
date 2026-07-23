// 인앱 브라우저 판별 로직 (구성원 콘텐츠 접근 게이트용)
//
// 배경: 회사 모바일앱의 인앱 브라우저(WebView)는 커스텀 헤더/UA 토큰을 넣지 않으므로,
// User-Agent 문자열 패턴만으로 판별한다. (진단 결과 근거)
//   - iOS 인앱 WebView(WKWebView) : UA에 Version/·Safari 토큰이 빠짐
//       예) Mozilla/5.0 (iPhone; ...) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148
//   - iOS 일반 브라우저(사파리)     : ...Version/26.5.2 Mobile/15E148 Safari/604.1  (Safari 있음)
//   - Android 인앱 WebView          : UA에 'wv' 토큰 포함
//
// 한계: UA는 위조 가능하며, "우리 회사 앱"인지까지는 구분 못 한다(다른 앱 WebView도 통과 가능).
// 이는 캐주얼 차단 수준이며, 엄격히 하려면 앱팀의 커스텀 헤더가 필요하다.

export type ClientClass =
  | "ios-webview"
  | "ios-browser"
  | "android-webview"
  | "android-browser"
  | "other"
  | "unknown";

export function classifyClient(ua: string | null | undefined): ClientClass {
  if (!ua) return "unknown";
  if (/(iPhone|iPad|iPod)/.test(ua)) {
    // iOS 인앱 WebView는 UA에 Safari 토큰이 없음.
    // (iOS 크롬 CriOS / 파폭 FxiOS 등 서드파티 브라우저는 Safari 토큰을 포함하므로 browser로 분류됨)
    return /Safari/.test(ua) ? "ios-browser" : "ios-webview";
  }
  if (/Android/.test(ua)) {
    return /\bwv\b/.test(ua) ? "android-webview" : "android-browser";
  }
  return "other";
}

// 게이트 적용 모드 (환경변수 INAPP_GATE_MODE)
//   "off" : 게이트 비활성 (긴급 해제용)
//   "ios" : iOS 일반 브라우저만 차단 (기본값 — Android/데스크탑은 아직 통과)
//   "all" : 인앱 WebView가 아닌 모든 접속 차단 (Android 규칙 검증 후 전환)
export type GateMode = "off" | "ios" | "all";

export function getGateMode(): GateMode {
  const v = process.env.INAPP_GATE_MODE;
  if (v === "off" || v === "ios" || v === "all") return v;
  return "ios";
}

export function isBlocked(klass: ClientClass, mode: GateMode): boolean {
  if (mode === "off") return false;
  if (mode === "ios") return klass === "ios-browser";
  // "all": 인앱 WebView가 아니면 차단. 단 unknown(UA 없음)은 통과(fail-open).
  return (
    klass === "ios-browser" ||
    klass === "android-browser" ||
    klass === "other"
  );
}

// 게이트를 적용할 구성원 콘텐츠 경로.
// 계정 흐름(/login, /signup, /reset-password, /auth, /consent, /change-password),
// 관리자(/admin), 진단(/whoami), 안내(/app-required), API/정적파일은 대상이 아니다.
const GATED_PREFIXES = ["/books", "/ranking", "/my"];

export function isGatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return GATED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// 회사 공인 IP 대역 (사내망/회사 Zscaler 게이트웨이).
// 이 대역에서 온 접속은 인앱이 아니어도 허용한다.
const COMPANY_CIDRS = [
  "165.225.228.0/23",
  "147.161.192.0/23",
  "165.225.102.0/24",
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = n * 256 + octet;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || !Number.isInteger(bits)) {
    return false;
  }
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

export function isCompanyIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  // IPv6-mapped IPv4 (::ffff:1.2.3.4) 형태 정규화
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  return COMPANY_CIDRS.some((cidr) => ipv4InCidr(v4, cidr));
}
