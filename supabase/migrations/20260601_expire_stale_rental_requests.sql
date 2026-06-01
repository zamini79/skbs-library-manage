-- 15분 경과한 pending 대출 신청 자동 반려
--
-- /api/cron/expire-requests 가 5분마다 호출. requested_at 이 15분을 초과한 pending 요청을
-- rejected 로 전환한다. rejected 는 processed_at/processed_by NOT NULL 제약이 있으므로
-- cs_admin 을 시스템 처리자로 기록하고 reject_reason 으로 자동 취소임을 구분한다.
-- (enum 변경 없이 기존 rr_processed_consistency CHECK 충족)
--
-- pending 이 rejected 되면 rental_requests_one_pending_per_book unique 인덱스가 풀려
-- 다른 사용자가 해당 도서를 다시 신청할 수 있다. pending 은 books.available_quantity 를
-- 점유하지 않으므로 수량 보정은 불필요하다.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

CREATE OR REPLACE FUNCTION public.expire_stale_rental_requests()
RETURNS INTEGER AS $$
DECLARE
  v_admin_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_admin_id FROM public.admins WHERE login_id = 'cs_admin@sk.com' LIMIT 1;
  IF v_admin_id IS NULL THEN
    -- 시스템 처리자 계정이 없으면 아무 admin 으로 폴백
    SELECT id INTO v_admin_id FROM public.admins ORDER BY created_at LIMIT 1;
  END IF;

  UPDATE public.rental_requests
     SET status = 'rejected',
         processed_at = NOW(),
         processed_by = v_admin_id,
         reject_reason = '15분 경과 자동 취소',
         updated_at = NOW()
   WHERE status = 'pending'
     AND requested_at < NOW() - INTERVAL '15 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.expire_stale_rental_requests IS
  '15분 경과 pending 대출 신청을 rejected(자동 취소)로 전환. 5분마다 Vercel Cron 호출.';
