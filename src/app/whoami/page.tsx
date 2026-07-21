// 임시 진단 페이지 — 인앱 브라우저 판별용 신호 확인 목적
// 이 페이지를 ① 회사 앱 인앱 브라우저 ② 일반 폰 브라우저에서 각각 열어
// User-Agent / 헤더를 비교하면 "앱에만 있는 고유 신호"를 찾을 수 있다.
// 신호 확인이 끝나면 이 파일(src/app/whoami)은 삭제할 것.
import { headers } from "next/headers";

// 절대 캐시되지 않도록 매 요청 동적 렌더링
export const dynamic = "force-dynamic";

export default function WhoAmIPage() {
  const h = headers();
  const userAgent = h.get("user-agent") ?? "(없음)";

  // 앱이 실어보낼 만한 커스텀 헤더 후보들
  const interesting = [
    "user-agent",
    "referer",
    "x-requested-with", // 안드로이드 WebView가 앱 패키지명을 넣는 경우가 많음
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-fetch-site",
    "sec-fetch-mode",
    "x-app-client",
    "x-app-name",
    "x-app-version",
  ];

  const allHeaders: Array<[string, string]> = [];
  h.forEach((value, key) => allHeaders.push([key, value]));
  allHeaders.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: 1.5,
        wordBreak: "break-all",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>접속 환경 진단</h1>
      <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>
        이 화면을 앱 인앱 브라우저와 일반 브라우저에서 각각 캡처해 비교하세요.
      </p>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 15, color: "#EA002C" }}>User-Agent</h2>
        <pre
          style={{
            background: "#f4f4f2",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {userAgent}
        </pre>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 15, color: "#EA002C" }}>주요 헤더</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {interesting.map((key) => (
              <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600, verticalAlign: "top", width: 160 }}>
                  {key}
                </td>
                <td style={{ padding: "6px 8px", color: h.get(key) ? "#111" : "#bbb" }}>
                  {h.get(key) ?? "(없음)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 15, color: "#888" }}>전체 헤더 (참고)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {allHeaders.map(([key, value]) => (
              <tr key={key} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "4px 8px", fontWeight: 600, verticalAlign: "top", width: 160 }}>
                  {key}
                </td>
                <td style={{ padding: "4px 8px", color: "#444" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
