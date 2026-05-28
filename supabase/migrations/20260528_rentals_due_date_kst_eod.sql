-- 대여 정책 정렬: "대출 당일 포함 14일" → 마지막 가능일의 KST 23:59:59.999 를 due_date 로 저장
--
-- 변경 전: due_date = rented_at + 14일 (timestamp 그대로, 시각 포함) → "당일 반납 = 정시" 가
--          rented_at 의 시각에 따라 어긋남.
-- 변경 후: due_date = (rented_at 의 KST 일자 + 13) at 23:59:59.999 KST
--          → 트리거(returned_at > due_date), cron(due_date < NOW()), cooldown(KST date diff),
--            알림 cron(KST date diff) 모두 보정 없이 자연스럽게 동작.
--
-- 대상: rentals 의 모든 행 (active / overdue / returned). 반납 완료 행도 일관성 위해 함께 보정.
--   - 임포트된 반납 행들은 returned_at = rented_at + 10일 < new due_date → 여전히 정시 (영향 없음).
--   - 미반납(active) 중 새 규칙으로 due_date 가 과거가 되는 행은 status 가 active 로 남는데, 다음
--     update_overdue_rentals cron 실행에서 overdue 로 자동 전환된다. 즉시 반영하려면 마이그레이션 후
--     수동 호출: GET /api/cron/update-overdue with Authorization.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

UPDATE public.rentals
SET due_date =
      (((rented_at AT TIME ZONE 'Asia/Seoul')::date + 13)::timestamp
        AT TIME ZONE 'Asia/Seoul')
      + INTERVAL '23 hours 59 minutes 59.999 seconds';

-- 검증:
--   SELECT id, rented_at,
--          (rented_at AT TIME ZONE 'Asia/Seoul')::date AS kst_rented_date,
--          due_date,
--          (due_date AT TIME ZONE 'Asia/Seoul')::date AS kst_due_date
--   FROM public.rentals
--   ORDER BY rented_at DESC
--   LIMIT 5;
--   → kst_due_date 가 kst_rented_date + 13 이어야 정상.
