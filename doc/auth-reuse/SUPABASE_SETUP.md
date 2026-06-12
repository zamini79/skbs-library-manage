# Supabase 설정 — 이메일 OTP 가입 (Gmail SMTP)

새 Supabase 프로젝트에서 "이메일로 인증번호 보내 가입" 흐름을 켜는 단계입니다.
**이 설정 없이는 코드만 복사해도 메일이 안 갑니다.**

소요: 약 5~10분.

---

## 1. 프로젝트 생성 & 키 확보
1. https://supabase.com → New project (Region: `Northeast Asia (Seoul)` 권장)
2. Project Settings → **API**에서 복사해 `.env.local`에 입력
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 노출 금지)

## 2. 이메일 인증을 "OTP 코드" 방식으로
Authentication → **Sign In / Providers → Email**
- **Enable Email provider**: ON
- **Confirm email**: ON
- 기본 이메일에는 매직링크와 `{{ .Token }}`(6자리 코드)가 함께 들어 있습니다.
  코드 방식만 쓰려면 아래 4번 템플릿에서 링크를 빼고 **`{{ .Token }}` 만** 남기면 됩니다.
- (선택) Authentication → **Rate Limits / Advanced**에서 OTP 만료시간(기본 1시간) 확인.

> 코드에서 `signInWithOtp({ email, options: { shouldCreateUser: true } })` 호출 →
> Supabase가 이 템플릿으로 메일 발송. `verifyOtp({ email, token, type: 'email' })`로 검증.

## 3. Gmail을 SMTP로 연결 (발송 한도/도달률 ↑) ★
> Supabase 기본 메일은 시간당 발송 한도가 매우 낮아 실서비스엔 부적합. 커스텀 SMTP 필수.

### 3-1. Gmail 앱 비밀번호 발급
1. 발송용 Google 계정 → **2단계 인증(2FA) 활성화** (필수)
2. Google 계정 → 보안 → **앱 비밀번호** → 앱 "메일" 선택 → 16자리 비밀번호 생성·복사

### 3-2. Supabase에 입력
Authentication → **Emails → SMTP Settings → Enable Custom SMTP**
| 항목 | 값 |
|---|---|
| Sender email | 발송 Gmail 주소 (예: `noreply.myapp@gmail.com`) |
| Sender name | 서비스명 (예: `내 서비스`) |
| Host | `smtp.gmail.com` |
| Port | `465` (SSL) 또는 `587` (TLS) |
| Username | 발송 Gmail 주소 (전체) |
| Password | **위에서 만든 16자리 앱 비밀번호** (Gmail 로그인 비번 아님) |

> ⚠️ Google Workspace(회사 Gmail)는 조직 정책상 SMTP/앱비밀번호가 막혀 있을 수 있음.
> 그 경우 개인 Gmail로 발송하거나, 사내 SMTP 릴레이 / SendGrid·Resend 등을 사용.
> 회사 도메인 메일을 "발신자"로 쓰려면 SPF/DKIM 정렬이 필요(스팸 처리 방지).

## 4. 한국어 OTP 메일 템플릿
Authentication → **Emails → Templates → Confirm signup** (또는 Magic Link) →
Subject / Body를 아래로 교체:

**Subject**
```
[내 서비스] 이메일 인증 코드
```

**Body (HTML)** — 코드만 쓰는 버전
```html
<div style="font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;font-size:11pt;line-height:1.7;color:#1a1a1a;">
  <p>안녕하세요, <strong>내 서비스</strong> 회원가입 인증 코드입니다.</p>
  <p style="font-size:22pt;font-weight:700;letter-spacing:4px;margin:16px 0;">{{ .Token }}</p>
  <p>위 6자리 코드를 입력 화면에 넣어주세요. 코드는 약 1시간 후 만료됩니다.</p>
  <p style="color:#888;font-size:9pt;margin-top:24px;">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
</div>
```
> `{{ .Token }}` 가 6자리 코드입니다. 매직링크(`{{ .ConfirmationURL }}`)는 코드 방식에선 빼도 됩니다.

## 5. URL 설정
Authentication → **URL Configuration**
- Site URL: `http://localhost:3000` (개발) / 배포 후 실제 도메인
- Redirect URLs: 위 도메인들 추가 (OTP 코드 방식만 쓰면 redirect는 크게 중요치 않지만 등록 권장)

---

## 점검
- `/signup`에서 이메일 입력 → **수 초 내 코드 메일 수신**되면 SMTP 정상
- 안 오면: 스팸함 확인 → Supabase **Logs → Auth** 에서 발송 에러 확인 (대개 SMTP 인증 실패 = 앱 비밀번호 오타/2FA 미설정)
