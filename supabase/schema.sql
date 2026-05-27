-- ============================================================================
-- 사내 도서 관리 시스템 - Supabase Schema
-- Version: v0.3.2 (date_trunc 함수 인덱스 제거)
-- Date: 2026-05-15
-- DBMS: PostgreSQL 15+ (Supabase)
-- ============================================================================
--
-- 실행 순서:
--   1. Extensions
--   2. ENUM Types
--   3. Tables (users, admins, books, rentals, mileage_history)
--   4. Indexes
--   5. Functions & Triggers (자동 마일리지 적립, 도서 상태 갱신)
--   6. Row Level Security (RLS) Policies
--   7. Seed Data (초기 관리자 계정)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- bcrypt 비밀번호 해시용
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- 도서 제목/저자 LIKE 검색용 (GIN 인덱스)


-- ----------------------------------------------------------------------------
-- 2. ENUM TYPES
-- ----------------------------------------------------------------------------

-- 도서 카테고리 (4종 고정)
CREATE TYPE book_category AS ENUM (
  '철학/종교/인문',
  '사회과학',
  '문학',
  '역사/여행'
);

-- 도서 상태
CREATE TYPE book_status AS ENUM (
  'active',     -- 활성 (대여 가능)
  'disposed'    -- 폐기
);

-- 대여 상태
CREATE TYPE rental_status AS ENUM (
  'active',     -- 대여 중
  'returned',   -- 반납 완료
  'overdue'     -- 연체
);

-- 관리자 역할
CREATE TYPE admin_role AS ENUM (
  'master',     -- 마스터 관리자 (cs_admin) - 도서 마스터 + 대여 관리
  'book'        -- 대여 관리자 (book_admin) - 대여/반납 처리만
);

-- 마일리지 변동 사유
CREATE TYPE mileage_reason AS ENUM (
  'return_on_time',   -- 정상 반납 (+10)
  'return_overdue'    -- 연체 반납 (-5)
);

-- 도서 폐기 사유
CREATE TYPE disposal_reason AS ENUM (
  'lost',       -- 분실
  'damaged',    -- 파손
  'outdated',   -- 노후
  'other'       -- 기타
);


-- ----------------------------------------------------------------------------
-- 3. TABLES
-- ----------------------------------------------------------------------------

-- ====================
-- USERS (구성원)
-- ====================
-- Supabase Auth(auth.users)와 1:1 매핑되는 프로필 테이블.
-- id는 auth.users.id를 그대로 사용 (회원가입 시 자동 생성).
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  employee_no     TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL,
  mileage         INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 회사 이메일 도메인 강제
  CONSTRAINT email_domain_check CHECK (email LIKE '%@sk.com')
);

COMMENT ON TABLE public.users IS '구성원 프로필 (auth.users와 연결)';
COMMENT ON COLUMN public.users.mileage IS '누적 마일리지 점수 (음수 허용)';


-- ====================
-- ADMINS (관리자)
-- ====================
-- Supabase Auth와 분리된 별도 인증 (login_id + password_hash).
-- 관리자는 자체 로그인 페이지(/admin/login)로 접근.
CREATE TABLE public.admins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  login_id        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,  -- bcrypt
  role            admin_role NOT NULL,
  name            TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 비밀번호 정책: 6자 이상 (해시 길이가 아닌 정책상 명시용)
  CONSTRAINT login_id_format CHECK (login_id IN ('cs_admin', 'book_admin'))
);

COMMENT ON TABLE public.admins IS '관리자 계정 (cs_admin / book_admin)';


-- ====================
-- BOOKS (도서 마스터)
-- ====================
CREATE TABLE public.books (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  author                TEXT NOT NULL,
  publisher             TEXT NOT NULL,
  isbn                  TEXT,
  price                 INTEGER NOT NULL DEFAULT 0,
  category              book_category NOT NULL,
  cover_url             TEXT,                       -- 수동 업로드 (우선)
  cover_url_external    TEXT,                       -- ISBN 조회 자동 채움 (fallback)
  total_quantity        INTEGER NOT NULL DEFAULT 1,
  available_quantity    INTEGER NOT NULL DEFAULT 1, -- 현재 가용 수량 (대여 시 자동 감소)
  status                book_status NOT NULL DEFAULT 'active',
  disposed_at           TIMESTAMPTZ,
  disposal_reason       disposal_reason,
  created_by            UUID REFERENCES public.admins(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT quantity_check CHECK (
    total_quantity >= 0 AND
    available_quantity >= 0 AND
    available_quantity <= total_quantity
  ),
  CONSTRAINT price_check CHECK (price >= 0),
  CONSTRAINT disposal_consistency CHECK (
    (status = 'disposed' AND disposed_at IS NOT NULL AND disposal_reason IS NOT NULL) OR
    (status = 'active' AND disposed_at IS NULL AND disposal_reason IS NULL)
  )
);

COMMENT ON TABLE public.books IS '도서 마스터';
COMMENT ON COLUMN public.books.available_quantity IS '대여 가능한 수량. 대여/반납 시 트리거로 자동 갱신';


-- ====================
-- RENTALS (대여 이력)
-- ====================
CREATE TABLE public.rentals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id             UUID NOT NULL REFERENCES public.books(id),
  user_id             UUID NOT NULL REFERENCES public.users(id),
  admin_id            UUID NOT NULL REFERENCES public.admins(id),     -- 대여 담당자
  return_admin_id     UUID REFERENCES public.admins(id),              -- 반납 담당자
  rented_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date            TIMESTAMPTZ NOT NULL,
  returned_at         TIMESTAMPTZ,
  status              rental_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT due_date_check CHECK (due_date > rented_at),
  CONSTRAINT returned_at_check CHECK (returned_at IS NULL OR returned_at >= rented_at),
  CONSTRAINT status_consistency CHECK (
    (status IN ('active', 'overdue') AND returned_at IS NULL AND return_admin_id IS NULL) OR
    (status = 'returned' AND returned_at IS NOT NULL AND return_admin_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.rentals IS '대여 이력 (대여/반납/연체 통합 관리)';


-- ====================
-- MILEAGE_HISTORY (마일리지 변동 이력)
-- ====================
CREATE TABLE public.mileage_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id),
  rental_id       UUID NOT NULL REFERENCES public.rentals(id),
  points          INTEGER NOT NULL,
  reason          mileage_reason NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT points_check CHECK (
    (reason = 'return_on_time' AND points = 10) OR
    (reason = 'return_overdue' AND points = -5)
  )
);

COMMENT ON TABLE public.mileage_history IS '마일리지 적립/차감 이력';


-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------

-- users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_employee_no ON public.users(employee_no);
CREATE INDEX idx_users_mileage_desc ON public.users(mileage DESC) WHERE is_active = TRUE;

-- books
CREATE INDEX idx_books_status ON public.books(status);
CREATE INDEX idx_books_category ON public.books(category);
CREATE INDEX idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX idx_books_author_trgm ON public.books USING gin (author gin_trgm_ops);
CREATE INDEX idx_books_isbn ON public.books(isbn) WHERE isbn IS NOT NULL;

-- rentals
CREATE INDEX idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX idx_rentals_book_id ON public.rentals(book_id);
CREATE INDEX idx_rentals_status ON public.rentals(status);
CREATE INDEX idx_rentals_due_date ON public.rentals(due_date) WHERE status IN ('active', 'overdue');
CREATE INDEX idx_rentals_rented_at ON public.rentals(rented_at DESC);
-- 사용자별 + 시간순 복합 인덱스 (월 카운트 쿼리 최적화)
CREATE INDEX idx_rentals_user_rented ON public.rentals(user_id, rented_at DESC);

-- mileage_history
CREATE INDEX idx_mileage_user_id ON public.mileage_history(user_id);
CREATE INDEX idx_mileage_created_at ON public.mileage_history(created_at DESC);


-- ----------------------------------------------------------------------------
-- 5. FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- ====================
-- 5.1 updated_at 자동 갱신
-- ====================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rentals_updated_at BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ====================
-- 5.2 대여 시 도서 가용 수량 감소
-- ====================
CREATE OR REPLACE FUNCTION public.decrease_book_availability()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.books
     SET available_quantity = available_quantity - 1
   WHERE id = NEW.book_id
     AND available_quantity > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION '도서의 가용 수량이 없습니다 (book_id: %)', NEW.book_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rental_decrease_book
  AFTER INSERT ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.decrease_book_availability();


-- ====================
-- 5.3 반납 처리: 가용 수량 복구 + 마일리지 자동 적립
-- ====================
CREATE OR REPLACE FUNCTION public.process_book_return()
RETURNS TRIGGER AS $$
DECLARE
  is_overdue BOOLEAN;
  mileage_pts INTEGER;
  mileage_rsn mileage_reason;
BEGIN
  -- status가 active/overdue → returned로 전환될 때만 동작
  IF NEW.status = 'returned' AND OLD.status IN ('active', 'overdue') THEN

    -- 1) 도서 가용 수량 복구
    UPDATE public.books
       SET available_quantity = available_quantity + 1
     WHERE id = NEW.book_id;

    -- 2) 연체 여부 판단 (반납일이 반납기한을 넘었는가)
    is_overdue := NEW.returned_at > NEW.due_date;

    IF is_overdue THEN
      mileage_pts := -5;
      mileage_rsn := 'return_overdue';
    ELSE
      mileage_pts := 10;
      mileage_rsn := 'return_on_time';
    END IF;

    -- 3) 마일리지 이력 기록
    INSERT INTO public.mileage_history (user_id, rental_id, points, reason)
    VALUES (NEW.user_id, NEW.id, mileage_pts, mileage_rsn);

    -- 4) 구성원 누적 마일리지 갱신
    UPDATE public.users
       SET mileage = mileage + mileage_pts
     WHERE id = NEW.user_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rental_return_process
  AFTER UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.process_book_return();


-- ====================
-- 5.4 연체 자동 갱신 (Vercel Cron이 매일 자정 호출)
-- ====================
CREATE OR REPLACE FUNCTION public.update_overdue_rentals()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.rentals
     SET status = 'overdue'
   WHERE status = 'active'
     AND due_date < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_overdue_rentals IS
  '매일 자정 Vercel Cron이 호출하여 반납기한 경과 대여를 연체 상태로 전환';


-- ====================
-- 5.5 대여 가능 여부 검증 함수 (애플리케이션에서 RPC로 호출)
-- ====================
CREATE OR REPLACE FUNCTION public.check_rental_eligibility(
  p_user_id UUID,
  p_book_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_book_available INTEGER;
  v_book_status book_status;
  v_monthly_count INTEGER;
  v_current_holding INTEGER;
  v_overdue_count INTEGER;
  v_result JSON;
BEGIN
  -- 1) 도서 상태 확인
  SELECT available_quantity, status INTO v_book_available, v_book_status
    FROM public.books WHERE id = p_book_id;

  -- 2) 이번 달 대여 건수 (active + returned + overdue 모두 포함)
  SELECT COUNT(*) INTO v_monthly_count
    FROM public.rentals
   WHERE user_id = p_user_id
     AND rented_at >= date_trunc('month', NOW())
     AND rented_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  -- 3) 현재 보유 권수 (active + overdue)
  SELECT COUNT(*) INTO v_current_holding
    FROM public.rentals
   WHERE user_id = p_user_id
     AND status IN ('active', 'overdue');

  -- 4) 연체 보유 권수
  SELECT COUNT(*) INTO v_overdue_count
    FROM public.rentals
   WHERE user_id = p_user_id
     AND status = 'overdue';

  v_result := json_build_object(
    'eligible',           (v_book_available > 0 AND v_book_status = 'active' AND
                           v_monthly_count < 2 AND v_current_holding < 2 AND
                           v_overdue_count = 0),
    'book_available',     v_book_available > 0,
    'book_active',        v_book_status = 'active',
    'monthly_count',      v_monthly_count,
    'monthly_remaining',  GREATEST(0, 2 - v_monthly_count),
    'current_holding',    v_current_holding,
    'holding_remaining',  GREATEST(0, 2 - v_current_holding),
    'overdue_count',      v_overdue_count,
    'has_overdue',        v_overdue_count > 0
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.check_rental_eligibility IS
  '대여 가능 여부 자동 검증 (월 2회, 동시 2권, 연체 여부 확인)';


-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

-- RLS 활성화
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_history ENABLE ROW LEVEL SECURITY;


-- ====================
-- USERS 정책
-- ====================
-- 본인 프로필 조회/수정 가능
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 마일리지 랭킹 조회를 위해 모든 사용자가 active users의 일부 필드 조회 허용
-- (애플리케이션에서 필요한 컬럼만 SELECT)
CREATE POLICY users_select_ranking ON public.users
  FOR SELECT USING (is_active = TRUE);

-- 회원가입 시 본인 레코드 생성
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ====================
-- BOOKS 정책
-- ====================
-- 모든 사용자(비로그인 anonymous 포함) 도서 조회 가능
CREATE POLICY books_select_all ON public.books
  FOR SELECT USING (TRUE);

-- INSERT/UPDATE/DELETE는 서버 사이드(service_role)로만 수행
-- 클라이언트에서는 차단 (별도 정책 없음 = 거부)


-- ====================
-- RENTALS 정책
-- ====================
-- 본인 대여 이력만 조회 가능
CREATE POLICY rentals_select_own ON public.rentals
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE는 서버 사이드(관리자 권한)로만


-- ====================
-- MILEAGE_HISTORY 정책
-- ====================
CREATE POLICY mileage_select_own ON public.mileage_history
  FOR SELECT USING (auth.uid() = user_id);


-- ====================
-- ADMINS 정책
-- ====================
-- 일반 클라이언트는 admins 테이블 접근 불가 (모든 SELECT 차단)
-- 관리자 인증은 서버 사이드 API에서 service_role로 처리


-- ----------------------------------------------------------------------------
-- 7. SEED DATA
-- ----------------------------------------------------------------------------

-- 초기 관리자 계정 2개 생성
-- 비밀번호: 'admin123!' (실제 운영 시 변경 필수)
-- bcrypt hash는 crypt() 함수로 생성

INSERT INTO public.admins (login_id, password_hash, role, name) VALUES
  ('cs_admin',   crypt('admin123!', gen_salt('bf', 10)), 'master', '마스터 관리자'),
  ('book_admin', crypt('admin123!', gen_salt('bf', 10)), 'book',   '대여 관리자')
ON CONFLICT (login_id) DO NOTHING;


-- ============================================================================
-- 참고: Vercel Cron 호출용 RPC 엔드포인트
-- ============================================================================
--
-- 매일 자정에 다음 SQL을 실행하도록 설정:
--   SELECT public.update_overdue_rentals();
--
-- Vercel Cron 설정 (vercel.json):
--   {
--     "crons": [{
--       "path": "/api/cron/update-overdue",
--       "schedule": "0 15 * * *"   // UTC 15:00 = KST 00:00
--     }]
--   }
--
-- /api/cron/update-overdue 핸들러에서 Supabase service_role 키로
-- supabase.rpc('update_overdue_rentals') 호출

-- ============================================================================
-- 참고: 자주 쓰는 쿼리 예시
-- ============================================================================

-- (1) 대시보드 KPI
-- SELECT
--   (SELECT COUNT(*) FROM books WHERE status = 'active') AS total_books,
--   (SELECT COUNT(*) FROM rentals WHERE status = 'active') AS active_rentals,
--   (SELECT COUNT(*) FROM rentals WHERE status = 'overdue') AS overdue_rentals,
--   (SELECT COUNT(*) FROM rentals
--    WHERE rented_at >= date_trunc('month', NOW())) AS this_month_rentals;

-- (2) 개인별 대여 TOP 10
-- SELECT u.name, u.department, COUNT(r.id) AS rental_count
--   FROM users u
--   JOIN rentals r ON u.id = r.user_id
--  GROUP BY u.id, u.name, u.department
--  ORDER BY rental_count DESC
--  LIMIT 10;

-- (3) 도서별 대여 TOP 10
-- SELECT b.title, b.author, COUNT(r.id) AS rental_count
--   FROM books b
--   JOIN rentals r ON b.id = r.book_id
--  GROUP BY b.id, b.title, b.author
--  ORDER BY rental_count DESC
--  LIMIT 10;

-- (4) 마일리지 TOP 10
-- SELECT name, department, mileage,
--        (SELECT COUNT(*) FROM rentals WHERE user_id = users.id) AS total_rentals
--   FROM users
--  WHERE is_active = TRUE
--  ORDER BY mileage DESC
--  LIMIT 10;

-- (5) 월별 대여 추이 (특정 월)
-- SELECT date_trunc('day', rented_at)::DATE AS day, COUNT(*) AS cnt
--   FROM rentals
--  WHERE rented_at >= '2026-05-01'
--    AND rented_at < '2026-06-01'
--  GROUP BY day
--  ORDER BY day;

-- ============================================================================
-- 끝.
-- ============================================================================
