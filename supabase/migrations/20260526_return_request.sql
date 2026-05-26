-- 사용자 반납 요청 (관리자 최종 확인 모델)
--
-- 흐름:
--   1) 사용자가 책장에서 "반납" 버튼 → rentals.return_requested_at = NOW() 만 셋팅
--   2) 도서는 여전히 active/overdue 상태 — books.available_quantity 변동 없음
--   3) 관리자가 "반납 확인" → 기존 /api/admin/rentals/[id]/return 트리거가 마무리
--      (status='returned', returned_at=NOW(), available_quantity 복구, 마일리지 갱신)
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN public.rentals.return_requested_at IS
  '사용자가 반납을 요청한 시각. 관리자가 반납 확인을 누르면 status=returned 으로 마무리.';

-- 빠른 조회용 인덱스 (반납 대기 목록)
CREATE INDEX IF NOT EXISTS rentals_return_requested_idx
  ON public.rentals (return_requested_at)
  WHERE return_requested_at IS NOT NULL AND status IN ('active', 'overdue');

-- RLS 정책 — 본인 active/overdue 대여만 return_requested_at 셀프 UPDATE 허용
-- 기존 users_update_own (rentals 에는 없음) 확인 → rentals 의 update 정책 추가 필요
DROP POLICY IF EXISTS rentals_update_own_return_request ON public.rentals;
CREATE POLICY rentals_update_own_return_request ON public.rentals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('active', 'overdue'))
  WITH CHECK (auth.uid() = user_id AND status IN ('active', 'overdue'));
