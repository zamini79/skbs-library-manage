# Phase 1 — Week 1 개발 가이드

> 사내 도서 관리 시스템 MVP의 첫 주 작업 가이드. 하루 단위로 진행 가능한 체크리스트.
> 작성: 2026-05-15 · 환경: macOS · Stack: Next.js 14 + Supabase + Vercel

---

## 🎯 1주차 목표

7일 내에 다음 상태에 도달:

- ✅ 로컬에서 `npm run dev` 실행 → 도서 목록·도서 상세 페이지 동작 (701권 로드됨)
- ✅ 관리자 로그인(`cs_admin`/`book_admin`) → 대시보드 진입
- ✅ 구성원 회원가입(@sk.com) → 로그인 → 내 정보 페이지
- ✅ 대여 등록 → 반납 처리 → 마일리지 자동 적립이 DB 트리거로 작동
- ✅ Vercel 배포 1회 성공 (preview URL)

---

## 📅 Day 1 — 프로젝트 셋업 (예상 2~3시간)

### 목표
Next.js + Supabase + Tailwind + shadcn/ui 기본 구성 + GitHub 저장소 + Vercel 연결.

### 작업
- [ ] **Supabase 프로젝트 생성** (https://supabase.com → New Project, region: `Northeast Asia (Seoul)`)
- [ ] **SQL Editor에서 `supabase_schema_v0.3.sql` 실행** → 5개 테이블 + 트리거 + RLS 생성 확인
- [ ] **Storage 버킷 `book-covers` 생성** (Public 설정)
- [ ] **로컬 프로젝트 생성**:
  ```bash
  cd ~/Work && mkdir library && cd library
  npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint
  ```
- [ ] **필수 패키지 설치**:
  ```bash
  npm install @supabase/supabase-js @supabase/ssr bcryptjs jose xlsx recharts \
              lucide-react clsx tailwind-merge date-fns zod react-hook-form @hookform/resolvers
  npm install -D @types/bcryptjs
  ```
- [ ] **shadcn/ui 셋업**:
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button input label card table tabs dialog select badge \
                       form toast skeleton dropdown-menu
  ```
- [ ] **디자인 토큰 적용** (`디자인토큰_v0.3.md` 참조 → `tailwind.config.ts` + `src/app/globals.css` 갱신)
- [ ] **환경 변수 작성** (`.env.local`):
  ```bash
  cp .env.example .env.local
  # Supabase URL/anon key/service_role key 입력
  echo "ADMIN_JWT_SECRET=$(openssl rand -hex 32)" >> .env.local
  echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
  ```
- [ ] **Supabase 타입 생성**:
  ```bash
  brew install supabase/tap/supabase
  supabase login
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
  ```
- [ ] **GitHub 저장소 생성 + 초기 push**:
  ```bash
  git init && git add . && git commit -m "chore: initial commit"
  gh repo create library --private --source=. --push
  ```
- [ ] **Vercel 연결**: vercel.com에서 import → 환경변수 등록 → 첫 배포 성공

### 완료 기준
`npm run dev` 실행 → 기본 Next.js 페이지에 shadcn 버튼 하나 띄워보면 디자인 토큰(SK 레드, 폰트) 적용됨이 확인된다.

---

## 📅 Day 2 — Supabase 연결 + 도서 목록 페이지 (예상 3~4시간)

### 목표
DB에서 도서를 읽어와 구성원 메인 페이지(`/`)에 렌더링. 701권 엑셀 일괄 등록.

### 작업
- [ ] **Supabase 클라이언트 모듈 작성**:
  - `src/lib/supabase/client.ts` (브라우저)
  - `src/lib/supabase/server.ts` (서버 컴포넌트)
  - `src/lib/supabase/admin.ts` (service_role, API Routes 전용)
  - 참고: https://supabase.com/docs/guides/auth/server-side/nextjs
- [ ] **정책 상수 모듈** `src/lib/policies.ts`:
  ```typescript
  export const RENTAL_POLICY = {
    RENTAL_PERIOD_DAYS: 14,
    MAX_MONTHLY_RENTALS: 2,
    MAX_CONCURRENT_HOLDINGS: 2,
    EMAIL_DOMAIN: '@sk.com',
  } as const;
  
  export const BOOK_CATEGORIES = [
    '철학/종교/인문', '사회과학', '음반', '문학', '역사/여행',
  ] as const;
  ```
- [ ] **도서 목록 페이지** `src/app/(member)/page.tsx`:
  - 서버 컴포넌트로 Supabase에서 `books` 전체 조회 (anonymous 접근 가능)
  - `BookCard` 컴포넌트로 그리드 표시 (4열 데스크탑 / 2열 모바일)
  - 카테고리 탭 필터 (URL 쿼리 파라미터 `?category=...`)
- [ ] **701권 데이터 일괄 등록**:
  - Supabase Dashboard → Table Editor → `books` 테이블 → Import data from CSV
  - 또는 직접 SQL: `도서목록_변환본_v0.3.xlsx`를 CSV로 내보내서 INSERT

> 💡 **Tip**: 일괄 등록은 임시로 Supabase Dashboard에서 처리하고, 정식 엑셀 업로드 기능은 Day 5에 구현. 그때 정합성 검증 + 미리보기 UI를 만든다.

- [ ] **도서 상세 페이지** `src/app/(member)/books/[id]/page.tsx`:
  - `params.id`로 books 단건 조회
  - 대여 통계(누적 대여 횟수)는 `rentals` 카운트로

### 완료 기준
브라우저에서 `localhost:3000` 접속 → 701권의 도서 카드가 카테고리별로 보임. 카테고리 탭 클릭 시 필터링 동작. 카드 클릭 → 상세 페이지.

---

## 📅 Day 3 — 관리자 인증 + 미들웨어 (예상 3~4시간)

### 목표
`cs_admin` / `book_admin` 로그인 → 보호된 `/admin/*` 페이지 진입.

### 작업
- [ ] **관리자 로그인 페이지** `src/app/admin/login/page.tsx`:
  - 와이어프레임 Screen 08 참조 (어두운 배경 + SK 레드 액센트)
  - login_id + password 입력 폼
- [ ] **로그인 API** `src/app/api/admin/login/route.ts`:
  ```typescript
  // 1. admins 테이블에서 login_id 조회 (service_role)
  // 2. bcrypt.compare로 비밀번호 검증
  // 3. jose.SignJWT로 JWT 생성 (payload: { adminId, role })
  // 4. httpOnly + secure 쿠키로 응답
  ```
- [ ] **미들웨어** `src/middleware.ts`:
  ```typescript
  // /admin/* 경로 진입 시 admin_session 쿠키 검증
  // 토큰 없거나 만료 → /admin/login으로 리디렉트
  // 토큰 유효 → next(); request에 role 정보 주입
  ```
- [ ] **관리자 레이아웃** `src/app/admin/layout.tsx`:
  - 좌측 사이드바 (`Sidebar.tsx`) + 상단 바 (`TopBar.tsx`) — 와이어프레임 그대로
  - 로그인된 관리자 이름·역할 표시
  - 로그아웃 버튼 → 쿠키 삭제
- [ ] **임시 대시보드 페이지** `src/app/admin/dashboard/page.tsx`:
  - 일단 "환영합니다, {name}" 메시지만. KPI는 Day 7에 채움.
- [ ] **권한 분리 헬퍼** `src/lib/auth/admin-auth.ts`:
  - `requireMaster()`: master 권한 없으면 403
  - `requireAny()`: book/master 둘 다 허용
  - 페이지별 가드: `/admin/books/*`은 master만, `/admin/rentals/*`은 둘 다.

### 완료 기준
초기 시드 비밀번호(`admin123!`)로 `cs_admin` 로그인 → `/admin/dashboard` 진입. 로그아웃 후 다시 `/admin/dashboard` 직접 진입 시 로그인 페이지로 리디렉트.

> 🔐 **보안 메모**: 초기 비밀번호는 운영 전에 반드시 변경. Day 3 마지막에 admins 테이블에서 직접 UPDATE해서 새 bcrypt 해시로 갱신.

---

## 📅 Day 4 — 구성원 회원가입 + 로그인 (예상 4~5시간)

### 목표
@sk.com 이메일로 회원가입 → 인증 → 로그인 → `/my/rentals` 진입.

### 작업
- [ ] **회원가입 페이지 (Step 1)** `src/app/(member)/signup/page.tsx`:
  - 이메일 입력 폼 (도메인 클라이언트 검증 + Zod)
  - Supabase Auth `signUp` 호출 (`emailRedirectTo` 설정)
  - 발송 완료 화면으로 전환
- [ ] **이메일 콜백** `src/app/auth/callback/route.ts`:
  - Supabase Auth가 매직 링크 클릭 시 호출
  - 코드 교환 후 Step 3 페이지로 리디렉트
- [ ] **회원가입 페이지 (Step 3)** `src/app/(member)/signup/complete/page.tsx`:
  - 비밀번호 + 사번 + 이름 + 부서 입력
  - `users` 테이블에 INSERT (id는 auth.users.id 그대로)
  - Supabase Auth `updateUser` 로 비밀번호 설정
  - 메인 페이지로 리디렉트
- [ ] **로그인 페이지** `src/app/(member)/login/page.tsx`:
  - 이메일 + 비밀번호 → `signInWithPassword`
  - 성공 시 `/` 또는 직전 경로로 리디렉트
- [ ] **공통 헤더** `src/app/(member)/layout.tsx`:
  - 로그인 상태에 따라 "로그인/회원가입" vs "프로필 + 로그아웃" 분기
- [ ] **`/my/rentals` 페이지** (간단 버전):
  - 로그인 안 했으면 `/login` 리디렉트
  - 로그인했으면 본인 정보 + 빈 대여 목록 표시
- [ ] **회원가입 도메인 제한 확인**:
  - Supabase Auth 정책 또는 코드에서 `email.endsWith('@sk.com')` 강제
  - 동시에 DB 레벨 CHECK 제약(`email_domain_check`)도 작동하는지 테스트

### 완료 기준
본인의 @sk.com 이메일로 가입 → 메일함에서 인증 → 비밀번호 + 사번 + 부서 입력 → `/my/rentals`에 본인 정보 표시. 다른 도메인(`@gmail.com` 등)으로는 가입 시도 시 차단됨.

---

## 📅 Day 5 — 도서 관리 (수동 등록 + 엑셀 일괄 업로드) (예상 5~6시간)

### 목표
관리자가 도서를 추가/수정/폐기. 엑셀 일괄 업로드로 수십~수백 권 등록.

### 작업
- [ ] **도서 목록 페이지 (관리자)** `src/app/admin/books/page.tsx`:
  - 와이어프레임 Screen 09 참조
  - 검색·카테고리 필터·상태 필터(가용/대여중/연체/폐기)
  - 페이지네이션 (25건/페이지)
  - "신규 입고" 버튼 → `/admin/books/new`
- [ ] **수동 도서 등록** `src/app/admin/books/new/page.tsx`:
  - 와이어프레임 Screen 02 참조
  - React Hook Form + Zod로 폼 검증
  - 카테고리 5종 select
  - 표지 이미지: Supabase Storage 업로드 → `cover_url` 저장
  - ISBN 자동 조회 버튼은 일단 비활성화(Phase 2)
- [ ] **엑셀 일괄 업로드** `src/app/admin/books/bulk-upload/page.tsx`:
  - `xlsx` 라이브러리로 파일 파싱
  - 검증 로직:
    - 필수 필드 (title, publisher, category, quantity) 누락 체크
    - category가 5종 enum 안에 있는지
    - price/quantity가 정수인지
  - 미리보기 테이블 (와이어프레임 Screen 02 하단 참조) — 정상 행은 초록, 오류 행은 빨강
  - "X건 등록 (오류 N건 제외)" 버튼 → API 호출
- [ ] **업로드 API** `src/app/api/admin/books/bulk-upload/route.ts`:
  - service_role 클라이언트로 books 테이블 INSERT (배치 처리)
  - 정합성 위반 시 트랜잭션 롤백
- [ ] **도서 폐기 기능**:
  - 목록에서 체크박스 선택 → 일괄 폐기 버튼
  - 폐기 사유 다이얼로그 (lost/damaged/outdated/other)
  - books.status = 'disposed', disposed_at = NOW()
  - 단, 대여 중인 도서(available_quantity < total_quantity)는 폐기 불가 검증

### 완료 기준
- `도서목록_변환본_v0.3.xlsx`를 일괄 업로드로 등록 시도 → 미리보기 → 모두 정상 → 등록 완료. (Day 2에서 직접 등록한 경우 테스트용 작은 엑셀로 검증)
- 수동으로 도서 1권 추가 → 목록에 즉시 반영
- 도서 1권 폐기 → 목록에서 폐기 뱃지 표시

---

## 📅 Day 6 — 대여 등록 + 반납 처리 (예상 4~5시간)

### 목표
대여/반납 처리가 정책 검증과 함께 동작하고, 마일리지가 자동 적립됨.

### 작업
- [ ] **대여 등록 페이지** `src/app/admin/rentals/new/page.tsx`:
  - 와이어프레임 Screen 03 참조
  - 좌측: 도서 검색 + 선택 (가용 도서만 표시)
  - 우측: 대여자 검색 + 선택 (users 테이블)
  - 자동 검증: `supabase.rpc('check_rental_eligibility', { p_user_id, p_book_id })` 호출
  - 결과를 체크리스트로 표시 (월 잔여 횟수, 보유 잔여 권수, 연체 여부, 도서 가용)
  - 모든 검증 통과 시에만 "대여 처리" 버튼 활성화
- [ ] **대여 등록 API** `src/app/api/admin/rentals/route.ts`:
  - service_role로 INSERT
  - `due_date = rented_at + INTERVAL '14 days'`
  - 트리거가 자동으로 books.available_quantity 감소
- [ ] **반납 처리 페이지** `src/app/admin/rentals/return/page.tsx`:
  - 와이어프레임 Screen 10 참조
  - 좌측: 대여 중인 도서 목록 (선택)
  - 우측: 반납 정보 미리보기 (연체 여부 표시, 예상 마일리지 변동)
- [ ] **반납 처리 API** `src/app/api/admin/rentals/[id]/return/route.ts`:
  - rentals 단순 UPDATE: `status='returned'`, `returned_at=NOW()`, `return_admin_id=...`
  - **DB 트리거 `process_book_return`이 자동으로**:
    - books.available_quantity 복구
    - 연체 여부 판단
    - mileage_history INSERT
    - users.mileage UPDATE
  - 코드에서 마일리지 계산 절대 금지!
- [ ] **연체 목록** `src/app/admin/rentals/overdue/page.tsx`:
  - status='overdue'인 rentals 목록
  - 연체 일수 (현재시각 - due_date) 계산해서 표시

### 완료 기준
- 가용 도서 1권 선택 + 대여자 선택 → 검증 통과 → 대여 등록 → books.available_quantity가 0이 됨
- 같은 도서 반납 처리 (반납기한 내) → available_quantity 1로 복구 + 해당 사용자 mileage 10 증가
- mileage_history에 +10 레코드 자동 생성 확인 (트리거 작동 검증)
- 일부러 due_date를 과거로 UPDATE 후 반납 처리 → mileage -5, mileage_history에 -5 레코드

---

## 📅 Day 7 — 대시보드 + 내 대여현황 + 배포 (예상 4~5시간)

### 목표
관리자 대시보드 KPI/TOP10 완성, 구성원의 내 대여현황 페이지 완성, Vercel 본 배포.

### 작업
- [ ] **대시보드 KPI 카드 4개**:
  - 전체 도서 / 대여 중 / 연체 / 이번 달 신규 대여
  - 각 카운트는 Supabase 쿼리로 (참고 쿼리는 `supabase_schema_v0.3.sql` 하단)
- [ ] **TOP 10 차트**:
  - 개인별 대여 TOP 10 (Recharts BarChart)
  - 도서별 대여 TOP 10
- [ ] **최근 대여 내역 + 연체 목록 (대시보드 하단)**
- [ ] **내 대여현황 페이지 완성** `src/app/(member)/my/rentals/page.tsx`:
  - 와이어프레임 Screen 06 참조
  - 마일리지 + 이번 달 잔여 횟수 + 보유 권수 카드
  - 현재 대여 중 / 과거 이력
- [ ] **Vercel Cron 설정** `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/update-overdue",
      "schedule": "0 15 * * *"
    }]
  }
  ```
- [ ] **Cron 핸들러** `src/app/api/cron/update-overdue/route.ts`:
  - `Authorization` 헤더에서 CRON_SECRET 검증
  - `supabase.rpc('update_overdue_rentals')` 호출
- [ ] **프로덕션 배포**:
  - main 브랜치 push → Vercel 자동 빌드
  - Supabase Auth Site URL을 본 도메인으로 변경
- [ ] **스모크 테스트**:
  - 본 도메인에서 회원가입 → 도서 조회 → 관리자 로그인 → 대여 → 반납 한 사이클

### 완료 기준
실제 production URL에서 1주차 목표(맨 위)가 모두 동작.

---

## 🧪 검증용 시나리오 (배포 후)

다음 시나리오들을 수동으로 한 번씩 돌려서 정책이 잘 동작하는지 확인:

1. **월 2회 제한**: 같은 사람으로 1달 안에 3번 대여 시도 → 3번째 거부
2. **동시 2권 제한**: 같은 사람이 2권 보유 중일 때 3번째 대여 시도 → 거부
3. **연체 중 대여 금지**: 연체 1권 있는 사람이 새 대여 시도 → 거부
4. **도메인 차단**: `@gmail.com`으로 가입 시도 → 차단 (UI + DB 양쪽)
5. **권한 분리**: `book_admin`으로 로그인 → `/admin/books/new` 접근 → 403 또는 메뉴 미노출
6. **마일리지 정합성**: 정상 반납 후 users.mileage 와 mileage_history 합계 일치
7. **트리거 정합성**: 대여 → books.available_quantity 감소, 반납 → 복구

---

## 📦 2주차 이후로 미루는 것들 (Phase 1 후반/Phase 2)

- 마일리지 랭킹 페이지 (구성원)
- 월별/개인별/도서별 통계 화면 (관리자)
- 사용자 관리 화면 (퇴사자 처리)
- ISBN 자동 조회 (알라딘 OpenAPI 연동)
- 도서 상세에서 대여 이력 그래프
- 검색 자동완성

---

## 🚨 1주차에 흔히 빠지는 함정

| 함정 | 대응 |
|---|---|
| `service_role` 키를 클라이언트 컴포넌트로 import | 반드시 API Routes/서버 컴포넌트에서만. ESLint 룰 추가 권장. |
| 대여 트리거를 모르고 코드에서 available_quantity 직접 감소 | 트리거가 처리하므로 코드는 INSERT만 |
| 반납 시 마일리지를 코드로 계산 | 트리거(process_book_return)가 처리. 코드는 status='returned'로 UPDATE만 |
| Supabase Auth 이메일 템플릿 영문 기본값 그대로 사용 | 한국어 템플릿으로 교체 (Dashboard → Auth → Email Templates) |
| RLS 정책 안 켜고 service_role로 모든 걸 처리 | 클라이언트 직접 조회(`books` SELECT 등) 케이스는 RLS로 보호 |
| 카테고리 enum 변경하려고 ALTER TYPE | enum 변경은 까다로움. 새 마이그레이션으로 진행 |

---

## 💡 작업 시작 시 Claude Code에게

새 세션 시작할 때 다음을 알려주면 효율적:

```
지금 Phase 1 Day X 작업을 진행할 거야. 
이 저장소의 CLAUDE.md를 먼저 읽고, 
docs/Phase1_Week1_가이드.md의 Day X 섹션을 참고해서 
체크리스트 순서대로 진행해줘.
```

---

*최종 업데이트: 2026-05-15 / 기획서 v0.3 기준*
