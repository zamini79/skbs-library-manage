-- 대여 한도 상향: 월 2회 → 3회, 동시 보유 2권 → 3권
--
-- 배경: 운영 정책 변경. 코드 상수(src/lib/policies.ts RENTAL_POLICY)와 반드시 함께 맞춰야 한다.
--       실제 대여 차단은 이 DB 함수의 eligible 값이 결정하므로, 상수만 바꾸고 이 마이그레이션을
--       적용하지 않으면 화면 안내(3회/3권)와 실제 동작(2회/2권)이 어긋난다.
--
-- 변경 범위: check_rental_eligibility 의 한도 수치 4곳뿐.
--            (eligible 판정 2곳, monthly_remaining, holding_remaining)
--            연체 쿨다운·연체 보유 차단 등 나머지 로직은 20260528_overdue_cooldown.sql 과 동일하다.
--
-- 적용 지점이 이 함수 한 곳이므로 모든 대여 생성 경로(멤버 대출 신청, 관리자 직접 대여,
-- 요청 승인, 사전 검사)에 자동 반영된다.
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
  -- 대여 한도 (src/lib/policies.ts RENTAL_POLICY 와 동기화 필요)
  c_max_monthly  CONSTANT INTEGER := 3;  -- 월 대여 횟수
  c_max_holding  CONSTANT INTEGER := 3;  -- 동시 보유 권수
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
                                v_monthly_count < c_max_monthly AND
                                v_current_holding < c_max_holding AND
                                v_overdue_count = 0 AND NOT v_in_cooldown),
    'book_available',          v_book_available > 0,
    'book_active',             v_book_status = 'active',
    'monthly_count',           v_monthly_count,
    'monthly_remaining',       GREATEST(0, c_max_monthly - v_monthly_count),
    'current_holding',         v_current_holding,
    'holding_remaining',       GREATEST(0, c_max_holding - v_current_holding),
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
  '대여 가능 여부 자동 검증 (월 3회, 동시 3권, 연체 보유, 연체 쿨다운 확인)';

-- 검증:
--   SELECT public.check_rental_eligibility('<user_uuid>', '<book_uuid>');
--   → 대여 이력이 없는 사용자면 monthly_remaining = 3, holding_remaining = 3 이어야 함.
--   → 2권 보유 중인 사용자면 holding_remaining = 1, eligible = true (기존에는 0 / false).
