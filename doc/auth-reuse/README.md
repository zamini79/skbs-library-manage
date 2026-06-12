# 이메일 OTP 회원가입 재사용 키트 (Next.js App Router + Supabase)

회원가입 시 **이메일로 6자리 인증번호(OTP)를 보내 확인**하고, 비밀번호를 설정해
가입을 완료하는 흐름을 다른 프로젝트에 그대로 이식하기 위한 키트입니다.

> 이 폴더(`doc/`)는 `tsconfig.json`의 `exclude`에 들어 있어 **현재 도서관 앱 빌드에는 포함되지 않습니다.**
> 순수 "복사해서 다른 프로젝트에 붙여넣는" 템플릿입니다.

---

## 0. 이 흐름의 두 개의 층 (가장 중요)

| 층 | 무엇 | 어디서 |
|---|---|---|
| **① 메일 발송 자체** | `signInWithOtp` 호출 시 **Supabase Auth가 직접** OTP 메일 발송 | Supabase 대시보드 설정 (SMTP=Gmail, 이메일 템플릿, OTP 활성화) → **`SUPABASE_SETUP.md`** |
| **② 앱 코드** | OTP 발송/검증/프로필 작성 페이지 + Supabase 클라이언트 | 이 폴더의 코드 → 복사 |

**둘 다 갖춰야 동작합니다.** 코드만 복사하고 ①을 안 하면 메일이 안 갑니다(또는 Supabase 기본 메일의 낮은 발송 한도에 걸림).

---

## 1. 동작 흐름

```
[signup]  이메일 입력 → check-exists(중복확인) → signInWithOtp(shouldCreateUser:true)
            │  Supabase가 OTP 메일 발송 (Gmail SMTP)
            ▼
[verify]  메일로 받은 6자리 코드 입력 → verifyOtp → 세션 생성
            ▼
[complete] 비밀번호 + 프로필(이름 등) 입력 → updateUser(password) + profile INSERT
            ▼
            가입 완료 → 홈으로
[login]   이후 이메일 + 비밀번호로 signInWithPassword
```

---

## 2. 기존(개발 중인) 프로젝트에 이식하는 체크리스트

### A. 패키지
```bash
npm install @supabase/supabase-js @supabase/ssr zod
```
UI는 shadcn/ui의 `Input` `Label` `Button`을 사용합니다. 없으면:
```bash
npx shadcn@latest add input label button
```
(또는 페이지의 import를 프로젝트의 기본 input/button으로 바꿔도 됨)

### B. 파일 복사 (이 폴더 → 프로젝트 `src/`)
| 이 키트 | 복사 위치 |
|---|---|
| `auth-config.ts` | `src/lib/auth-config.ts` |
| `lib/supabase/*.ts` | `src/lib/supabase/*.ts` |
| `app/signup/**`, `app/login/**` | `src/app/(auth)/...` (라우트 그룹은 자유) |
| `app/api/auth/**` | `src/app/api/auth/**` |

### C. 환경변수 (`.env.local`) — `.env.example` 참고
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # 서버 전용, 절대 클라이언트 노출 금지
```

### D. `auth-config.ts` 한 곳만 프로젝트에 맞게 수정 ★
- `allowedEmailDomain` — 가입 허용 도메인 (제한 없으면 `null`)
- `profileTable` / `profileFields` — 가입 완료 시 프로필을 넣을 테이블·컬럼
- `routes` — 가입 후/로그인 후 이동 경로

### E. DB — 프로필 테이블 (그 프로젝트의 Supabase)
가입 완료 시 `auth.users`와 1:1로 연결되는 프로필 행을 INSERT합니다. 최소 예시:
```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);
alter table public.users enable row level security;
-- 본인 행만 조회/수정
create policy users_select_own on public.users for select using (auth.uid() = id);
create policy users_insert_own on public.users for insert with check (auth.uid() = id);
```
`profileFields`에 컬럼을 추가하면 complete 폼이 자동으로 입력란을 렌더합니다.

### F. Supabase 대시보드 설정
**`SUPABASE_SETUP.md`** 의 단계대로 Email OTP 활성화 + Gmail SMTP + 한국어 템플릿 적용.

---

## 3. 이 키트에서 의도적으로 뺀 것 (도서관 전용 로직)
- 레거시 이관 계정 임시비밀번호 플로우
- 개인정보 동의 만료(consent lifecycle), 마일리지
- `member_remember` 자동 로그아웃 마커 — 순수 Supabase 세션만 사용하도록 단순화

필요하면 원본(`skbs-library-manage`)에서 가져다 붙이세요.

---

## 4. 빠른 점검
1. `.env.local` 채우고 `SUPABASE_SETUP.md` 완료
2. `/signup`에서 본인 이메일 입력 → 메일로 코드 수신 확인
3. 코드 입력 → 비밀번호/프로필 설정 → 홈 진입
4. 로그아웃 후 `/login`에서 이메일+비밀번호 로그인 확인
