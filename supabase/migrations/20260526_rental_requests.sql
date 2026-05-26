-- 대출 신청 (사용자 → 관리자 승인 모델)
--
-- 흐름:
--   1) 사용자가 도서 상세에서 "대출 신청" → INSERT rental_requests (status=pending)
--   2) 동일 도서에 대해 다른 사용자는 신청 불가 (UNIQUE INDEX on (book_id) WHERE pending)
--   3) 관리자가 "대여 등록" 페이지에서 승인 → rentals 생성(active) + request.status=approved + rental_id 연결
--   4) 관리자가 반려 → request.status=rejected, 도서는 다시 대출 가능
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

DO $$ BEGIN
  CREATE TYPE rental_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.rental_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id       UUID NOT NULL REFERENCES public.books(id),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        rental_request_status NOT NULL DEFAULT 'pending',
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  processed_by  UUID REFERENCES public.admins(id),
  reject_reason TEXT,
  rental_id     UUID REFERENCES public.rentals(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rr_processed_consistency CHECK (
    (status = 'pending'  AND processed_at IS NULL AND processed_by IS NULL) OR
    (status IN ('approved', 'rejected') AND processed_at IS NOT NULL AND processed_by IS NOT NULL)
  ),
  CONSTRAINT rr_approval_creates_rental CHECK (
    (status = 'approved' AND rental_id IS NOT NULL) OR
    (status <> 'approved')
  )
);

COMMENT ON TABLE public.rental_requests IS '사용자 대출 신청 큐. 승인 시 rentals 행 생성과 연결됨.';

-- 책당 pending 1건만 (다른 사용자 신청 차단)
CREATE UNIQUE INDEX IF NOT EXISTS rental_requests_one_pending_per_book
  ON public.rental_requests (book_id) WHERE status = 'pending';

-- 사용자별/책별 조회 인덱스
CREATE INDEX IF NOT EXISTS rental_requests_user_status_idx
  ON public.rental_requests (user_id, status);
CREATE INDEX IF NOT EXISTS rental_requests_status_requested_at_idx
  ON public.rental_requests (status, requested_at);

ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;

-- 본인 신청만 SELECT
DROP POLICY IF EXISTS rr_select_own ON public.rental_requests;
CREATE POLICY rr_select_own ON public.rental_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 본인 신청만 INSERT (status는 pending 만 허용)
DROP POLICY IF EXISTS rr_insert_own ON public.rental_requests;
CREATE POLICY rr_insert_own ON public.rental_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 본인 pending 만 DELETE (취소)
DROP POLICY IF EXISTS rr_delete_own_pending ON public.rental_requests;
CREATE POLICY rr_delete_own_pending ON public.rental_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- 관리자는 service_role 경유 → RLS 우회.

-- 책별 pending 여부 노출용 SECURITY DEFINER 함수
-- (anon/authenticated 모두 "이 책 대출 신청중인지" 확인 가능, 신청자 정보는 노출 안 함)
CREATE OR REPLACE FUNCTION public.is_book_requested(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rental_requests
     WHERE book_id = p_book_id AND status = 'pending'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_book_requested(uuid) TO anon, authenticated;

-- updated_at 트리거 (기존 패턴이 있다면 함수 재사용)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS rental_requests_touch_updated_at ON public.rental_requests;
CREATE TRIGGER rental_requests_touch_updated_at
  BEFORE UPDATE ON public.rental_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
