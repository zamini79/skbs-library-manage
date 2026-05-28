-- 연체 쿨다운 정책 추가
--
-- 룰: 연체로 반납된 대여마다 (returned_at + overdue_days * 1 day) 가 cooldown_until.
--     사용자의 cooldown_until 중 가장 늦은 값이 NOW() 보다 미래면 신규 대여 차단.
-- 일수 계산: KST 캘린더 day diff — due_date 5/14, 반납 5/16 → 2일 연체 → 반납일 +2일 쿨다운 (5/18 자정 이후 가능).
--
-- 적용 지점: check_rental_eligibility 한 곳. 모든 대여 생성 경로(멤버 요청, 관리자 직접 대여,
-- 요청 승인, 사전 검사) 가 이 RPC 의 eligible 을 참조하므로 자동 적용된다.
-- 응답 JSON 에 cooldown_until / in_cooldown / cooldown_days_remaining 추가.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

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
  v_cooldown_until TIMESTAMPTZ;
  v_in_cooldown BOOLEAN;
  v_cooldown_days_remaining INTEGER;
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

  -- 5) 연체 쿨다운: 과거 연체 반납건마다 cooldown_until = returned_at + KST 캘린더 연체일수
  --    그중 가장 늦은 시각이 현재의 쿨다운 종료 시각.
  SELECT MAX(
    returned_at + (
      GREATEST(
        ((returned_at AT TIME ZONE 'Asia/Seoul')::date
         - (due_date AT TIME ZONE 'Asia/Seoul')::date),
        0
      ) * INTERVAL '1 day'
    )
  ) INTO v_cooldown_until
    FROM public.rentals
   WHERE user_id = p_user_id
     AND status = 'returned'
     AND returned_at > due_date;  -- 연체 반납만

  v_in_cooldown := v_cooldown_until IS NOT NULL AND v_cooldown_until > NOW();
  v_cooldown_days_remaining := CASE
    WHEN v_in_cooldown
      THEN CEIL(EXTRACT(EPOCH FROM (v_cooldown_until - NOW())) / 86400.0)::INTEGER
    ELSE 0
  END;

  v_result := json_build_object(
    'eligible',                (v_book_available > 0 AND v_book_status = 'active' AND
                                v_monthly_count < 2 AND v_current_holding < 2 AND
                                v_overdue_count = 0 AND NOT v_in_cooldown),
    'book_available',          v_book_available > 0,
    'book_active',             v_book_status = 'active',
    'monthly_count',           v_monthly_count,
    'monthly_remaining',       GREATEST(0, 2 - v_monthly_count),
    'current_holding',         v_current_holding,
    'holding_remaining',       GREATEST(0, 2 - v_current_holding),
    'overdue_count',           v_overdue_count,
    'has_overdue',             v_overdue_count > 0,
    'cooldown_until',          v_cooldown_until,
    'in_cooldown',             v_in_cooldown,
    'cooldown_days_remaining', v_cooldown_days_remaining
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.check_rental_eligibility IS
  '대여 가능 여부 자동 검증 (월 2회, 동시 2권, 연체 보유, 연체 쿨다운 확인)';
