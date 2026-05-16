# CLAUDE.md

이 파일은 Claude Code가 프로젝트를 작업할 때 빠르게 컨텍스트를 파악하기 위한 브리핑 문서입니다. 모든 세션의 시작점에서 이 파일을 먼저 읽어주세요.

---

## 프로젝트 개요

**사내 도서 관리 시스템** (Phase 1 — MVP)

SK 사내 1층에 비치된 도서(약 701권)를 구성원에게 대여하는 서비스. 관리자가 도서 재고/대여를 관리하고, 구성원은 도서를 조회하고 자신의 대여 이력을 확인할 수 있다.

**현재 단계**: Phase 1 MVP 개발

---

## 핵심 정책 (코딩 시 반드시 준수)

### 사용자 권한
- **마스터 관리자** (`cs_admin`): 도서 마스터 관리 + 대여/반납 처리 + 사용자 관리
- **대여 관리자** (`book_admin`): 대여/반납 처리만
- **구성원**: 회사 이메일(`@sk.com`)로 가입, 조회만 가능
- **비로그인**: 도서 목록·상세·랭킹 조회 가능 (내 대여현황은 로그인 필수)

### 대여 정책
- 기본 대여 기간: **14일**
- 1인당 월 대여 횟수: **최대 2회** (매월 1일~말일 기준 리셋)
- 1인당 동시 보유 권수: **최대 2권**
- 연장: **불가**
- 연체 중 신규 대여: **불가**
- 동일 도서 재대여: **가능** (다른 제약 통과 시)
- 대여 가능 시간대: **평일 09:00~17:00** (운영 안내만, 시스템 검증 없음)

### 마일리지 정책
- 정상 반납: **+10점**
- 연체 반납: **-5점** (일수 무관)
- 음수 허용, 자동 적립 (DB 트리거)

### 도서 카테고리 (5종 고정)
1. 철학/종교/인문
2. 사회과학
3. 음반
4. 문학
5. 역사/여행

### 회원가입 도메인
`@sk.com`만 허용 (DB CHECK 제약 적용)

### 관리자 비밀번호 정책
6자 이상, 숫자+특수문자 포함, 만료 없음

---

## 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| Framework | Next.js 14 (App Router) | TypeScript |
| Styling | Tailwind CSS + shadcn/ui | |
| 차트 | Recharts | 대시보드 TOP10, 월별 추이 |
| DB | Supabase (PostgreSQL 15+) | RLS 활성 |
| 인증 (구성원) | Supabase Auth | Magic Link |
| 인증 (관리자) | 자체 구현 | bcrypt + httpOnly 쿠키 |
| 파일 저장 | Supabase Storage | 도서 표지 |
| 스케줄러 | Vercel Cron | 매일 자정 연체 갱신 |
| 외부 API | 알라딘 OpenAPI | ISBN 자동 조회 (Phase 2) |
| 엑셀 처리 | SheetJS (xlsx) | 일괄 업로드 |
| 형상 관리 | GitHub | |
| 배포 | Vercel | |

---

## 프로젝트 구조 (제안)

```
library/
├── .env.local                  # 로컬 환경 변수 (커밋 금지)
├── .env.example                # 환경 변수 템플릿
├── CLAUDE.md                   # 이 파일
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── vercel.json                 # Cron 설정
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (member)/           # 구성원 페이지 (반응형)
│   │   │   ├── page.tsx                # / (도서 조회)
│   │   │   ├── books/[id]/page.tsx     # 도서 상세
│   │   │   ├── ranking/page.tsx        # 마일리지 랭킹
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── my/rentals/page.tsx     # 내 대여현황
│   │   │   └── layout.tsx
│   │   │
│   │   ├── admin/              # 관리자 시스템 (PC)
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── books/
│   │   │   │   ├── page.tsx            # 목록
│   │   │   │   ├── new/page.tsx        # 수동 등록
│   │   │   │   ├── bulk-upload/page.tsx # 엑셀 일괄
│   │   │   │   └── [id]/page.tsx       # 상세
│   │   │   ├── rentals/
│   │   │   │   ├── new/page.tsx        # 대여 등록
│   │   │   │   ├── return/page.tsx     # 반납 처리
│   │   │   │   └── overdue/page.tsx    # 연체 목록
│   │   │   └── layout.tsx
│   │   │
│   │   └── api/                # API Routes
│   │       ├── admin/
│   │       │   ├── login/route.ts
│   │       │   └── books/bulk-upload/route.ts
│   │       └── cron/
│   │           └── update-overdue/route.ts
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 컴포넌트
│   │   ├── admin/              # 관리자용 컴포넌트
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   └── ...
│   │   └── member/             # 구성원용 컴포넌트
│   │       ├── BookCard.tsx
│   │       ├── BookGrid.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # 브라우저용
│   │   │   ├── server.ts       # 서버 컴포넌트용
│   │   │   └── admin.ts        # service_role (절대 클라이언트 노출 금지)
│   │   ├── auth/
│   │   │   ├── admin-auth.ts   # 관리자 인증 (bcrypt, JWT)
│   │   │   └── member-auth.ts  # Supabase Auth wrapper
│   │   ├── policies.ts         # 대여 정책 상수 (14일, 2회, 2권 등)
│   │   └── utils.ts
│   │
│   ├── types/
│   │   └── database.types.ts   # Supabase 타입 자동 생성
│   │
│   └── hooks/
│       ├── useBooks.ts
│       ├── useRentals.ts
│       └── ...
│
├── supabase/
│   ├── schema.sql              # 초기 스키마 (이 저장소의 supabase_schema_v0.3.sql)
│   └── migrations/             # 향후 마이그레이션
│
└── docs/
    ├── 기획서_v0.3.md
    ├── ERD_v0.3.html
    └── 와이어프레임_v0.3.html
```

---

## 개발 환경 설정 (macOS)

### 1. 사전 요구사항
- macOS 12 (Monterey) 이상
- [Homebrew](https://brew.sh) (패키지 매니저)
- Node.js 20 LTS 이상
- Git
- VSCode (권장)

처음 셋업하는 경우:

```bash
# Homebrew 설치 (이미 있으면 스킵)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 설치 (nvm 권장)
brew install nvm
mkdir -p ~/.nvm
# ~/.zshrc 에 nvm 초기화 코드 추가 후 터미널 재시작
nvm install 20
nvm use 20

# Git 설치 (보통 이미 설치되어 있음)
brew install git

# pnpm 권장 (옵션, npm보다 빠름)
brew install pnpm
```

### 2. 프로젝트 초기 설정

```bash
# 작업 디렉토리로 이동 (예시 경로, 자유롭게 변경 가능)
mkdir -p ~/Work && cd ~/Work
mkdir library && cd library

# Next.js 프로젝트 생성 (TypeScript + Tailwind + App Router)
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint

# 필수 패키지 설치
npm install @supabase/supabase-js @supabase/ssr
npm install bcryptjs jose
npm install xlsx recharts
npm install lucide-react clsx tailwind-merge
npm install date-fns

# 개발 도구
npm install -D @types/bcryptjs

# shadcn/ui 초기화
npx shadcn-ui@latest init
# 자주 쓸 컴포넌트 미리 설치
npx shadcn-ui@latest add button input label card table tabs dialog select badge
```

### 3. 환경 변수 (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # 서버 사이드 전용 (절대 노출 금지)

# 관리자 인증 (시크릿 생성: openssl rand -hex 32)
ADMIN_JWT_SECRET=...

# Vercel Cron (시크릿 생성: openssl rand -hex 32)
CRON_SECRET=...                          # /api/cron/* 보호용
```

> 💡 시크릿 시크릿 빠른 생성:
> ```bash
> echo "ADMIN_JWT_SECRET=$(openssl rand -hex 32)" >> .env.local
> echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
> ```

### 4. Supabase 프로젝트 설정

1. https://supabase.com 에서 새 프로젝트 생성 (region: `Northeast Asia (Seoul)`)
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Authentication → Providers → Email 설정:
   - "Confirm email" 활성화
   - Site URL: `http://localhost:3000` (dev) / `https://...` (prod)
4. Authentication → Email Templates → "Confirm signup" 한국어 템플릿 적용
5. Storage → 새 버킷 생성: `book-covers` (public)
6. Supabase CLI 설치 + 타입 자동 생성:
   ```bash
   brew install supabase/tap/supabase
   supabase login
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
   ```

---

## 주요 명령어

```bash
# 개발 서버
npm run dev                              # http://localhost:3000

# 빌드
npm run build
npm start

# Supabase 타입 재생성 (스키마 변경 시)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

# 형상 관리
git status
git add .
git commit -m "feat: 기능명"
git push

# Vercel 배포 (자동, GitHub 푸시 시)
# 또는 수동:
npx vercel --prod
```

---

## 작업 시 참고사항

### 보안
- **`SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출 금지**. 서버 컴포넌트나 API Routes에서만 사용.
- 관리자 인증은 Supabase Auth가 아닌 자체 구현 (`admins` 테이블 + bcrypt + JWT 쿠키).
- 구성원 인증은 Supabase Auth(`auth.users`).
- 관리자 페이지(`/admin/*`)는 미들웨어로 보호.
- 모든 폼은 Zod 등으로 검증.

### 데이터베이스 접근 패턴
- 구성원이 자기 데이터 조회 → 클라이언트에서 직접 Supabase (RLS 활용)
- 관리자가 전체 데이터 조회/수정 → API Routes에서 `service_role`로 처리
- 도서 목록 조회는 비로그인 anonymous도 가능 (RLS 정책 `books_select_all`)

### 대여/반납 로직
- **대여 가능 여부 검증**은 DB 함수 `check_rental_eligibility(user_id, book_id)`를 호출하여 일관성 보장
- **반납 처리는 단순히 `rentals.status = 'returned'` + `returned_at` 업데이트**만 하면 됨. 가용 수량 복구와 마일리지 적립은 트리거가 자동 처리.
- 연체 자동 갱신은 Vercel Cron이 매일 `update_overdue_rentals()` RPC 호출.

### 정책 상수
대여 정책 수치는 `src/lib/policies.ts`에 중앙화:
```typescript
export const RENTAL_POLICY = {
  RENTAL_PERIOD_DAYS: 14,
  MAX_MONTHLY_RENTALS: 2,
  MAX_CONCURRENT_HOLDINGS: 2,
  ALLOW_EXTENSION: false,
  ALLOW_RENTAL_WHEN_OVERDUE: false,
  EMAIL_DOMAIN: '@sk.com',
} as const;

export const MILEAGE_POLICY = {
  ON_TIME_RETURN: 10,
  OVERDUE_RETURN: -5,
} as const;

export const BOOK_CATEGORIES = [
  '철학/종교/인문',
  '사회과학',
  '음반',
  '문학',
  '역사/여행',
] as const;
```

### UI 컨벤션
- **관리자 시스템**: 1920×1080 기준, 좌측 사이드바 (220px) + 우측 메인. 배경 `#fafaf8`, 사이드바 `#1a1a1a`. 액센트 SK 레드 `#EA002C`.
- **구성원 페이지**: 반응형 (모바일 우선). 카드 그리드는 4열(데스크탑) → 2열(모바일).
- **공통 색상**: 정상 `#2a8a4a` (그린), 연체 `#EA002C` (레드), 대여중 `#0066cc` (블루).
- **폰트**: `Noto Sans KR` (본문) + `JetBrains Mono` (숫자/코드).
- shadcn/ui 컴포넌트 적극 활용. 디자인 토큰은 Tailwind config에 정의.

### 시간대
모든 시각 처리는 KST 기준. 화면 표시는 `YYYY-MM-DD HH:mm` 포맷 (date-fns + `ko` 로케일).

---

## Phase 1 개발 체크리스트

기능별로 진행 상황 추적. 완료 시 `[x]`로 변경.

### 인프라 설정
- [ ] GitHub 저장소 생성 및 초기 푸시
- [ ] Vercel 프로젝트 연결
- [ ] Supabase 프로젝트 생성 및 schema.sql 실행
- [ ] 환경 변수 설정 (로컬 + Vercel)
- [ ] shadcn/ui 셋업 및 디자인 토큰 정의

### 인증
- [ ] 구성원 회원가입 (3단계 플로우, @sk.com 도메인 검증)
- [ ] 구성원 로그인/로그아웃
- [ ] 관리자 로그인 (cs_admin / book_admin)
- [ ] 미들웨어 (`/admin/*` 보호, `/my/*` 보호)

### 도서 관리 (관리자)
- [ ] 도서 목록 (검색·필터·페이지네이션)
- [ ] 도서 상세
- [ ] 신규 입고 (수동 입력)
- [ ] 엑셀 일괄 업로드 (검증 + 미리보기 + 등록)
- [ ] 도서 폐기 처리

### 대여 관리 (관리자)
- [ ] 대여 등록 (도서+대여자 선택 + 자동 검증)
- [ ] 반납 처리 (연체 여부 자동 판단)
- [ ] 연체 목록

### 대시보드
- [ ] KPI 카드 4개
- [ ] 개인별 대여 TOP 10
- [ ] 도서별 대여 TOP 10
- [ ] 최근 대여 내역
- [ ] 연체 도서 목록

### 구성원 페이지
- [ ] 도서 조회 메인 (비로그인 가능, 반응형)
- [ ] 카테고리 필터, 검색
- [ ] 도서 상세
- [ ] 내 대여현황 (로그인 필수)

### 운영 자동화
- [ ] Vercel Cron 설정 (`/api/cron/update-overdue`)
- [ ] 초기 도서 701권 엑셀 데이터 준비 및 업로드

### Phase 2로 이월
- 마일리지 자동 정산 + 랭킹 페이지 (DB 트리거는 Phase 1에서 작동, UI만 Phase 2)
- ISBN 자동 조회 (외부 API 연동)
- 월별/개인별/도서별 통계 화면
- 사용자 관리 화면

---

## 자주 묻는 질문 (Claude Code용)

### Q. 새 페이지를 만들 때 어디에 둬야 하나?
- 관리자 페이지: `src/app/admin/...`
- 구성원 페이지: `src/app/(member)/...`
- 구성원 페이지는 layout.tsx에서 헤더(로고+네비+로그인) 공통 처리.

### Q. Supabase 클라이언트는 어디서 어떻게 만드는가?
- 클라이언트 컴포넌트: `import { createClient } from '@/lib/supabase/client'`
- 서버 컴포넌트: `import { createClient } from '@/lib/supabase/server'`
- 관리자 권한 API: `import { createAdminClient } from '@/lib/supabase/admin'` (service_role)

### Q. 대여 가능 여부를 어떻게 검증하나?
DB의 `check_rental_eligibility(user_id, book_id)` RPC 호출. 이 함수가 모든 정책(월 2회, 동시 2권, 연체 여부, 도서 가용 여부)을 한 번에 검증한다.

### Q. 반납 처리 시 마일리지 적립을 코드에서 직접 하나?
**아니오.** DB 트리거가 자동 처리한다. 코드에서는 단순히 `rentals.status = 'returned'`, `returned_at = NOW()`, `return_admin_id = ...`만 UPDATE.

### Q. 도서 표지는 어떻게 저장하나?
- 수동 업로드: Supabase Storage(`book-covers` 버킷) → `books.cover_url`에 public URL 저장
- ISBN 자동 조회(Phase 2): 외부 API URL을 `books.cover_url_external`에 그대로 저장 (자체 다운로드 X)
- 표시 우선순위: `cover_url || cover_url_external || /placeholder.png`

### Q. 비로그인 사용자도 도서 목록을 볼 수 있는데 어떻게?
Supabase RLS 정책 `books_select_all`이 anonymous 사용자에게도 SELECT 허용. 클라이언트에서 anon key로 그냥 조회하면 됨.

---

## 참고 문서

같은 저장소 `docs/` 폴더에 다음 문서들이 있다:
- `기획서_v0.3.md` — 전체 기획 (정책, 기능 명세, 화면 구성)
- `ERD_v0.3.html` — 데이터베이스 ERD 시각화
- `와이어프레임_v0.3.html` — 주요 화면 와이어프레임 (Part 1)
- `와이어프레임_Part2_v0.3.html` — 추가 화면 와이어프레임 (Part 2)
- `supabase_schema_v0.3.sql` — DB 스키마 SQL

새로운 결정사항이 생기면 기획서를 v0.4 등으로 업데이트하고 이 파일도 함께 갱신할 것.

---

*최종 업데이트: 2026-05-15 / 기획서 v0.3 기준*
