-- public.users — users_select_ranking 정책 제거
-- 배경: 이 정책이 anon role을 포함한 public에 USING (is_active = true) 만으로
--       SELECT 를 허용하고 있어, 직전 마이그레이션(users_select_own)을 추가했음에도
--       랭킹 정책이 살아있어 anon 전체 노출이 유지되고 있었음.
--       코드베이스 grep 결과 랭킹 기능 사용처 0건. 정책만 남은 상태라 안전하게 제거.
-- 향후 랭킹 기능이 필요해지면 (id, name, mileage) 만 노출하는 view 또는
-- RPC 함수로 분리해서 안전하게 추가할 것 (이메일/사번/부서 노출 금지).
--
-- Supabase Dashboard → SQL Editor 에서 실행

DROP POLICY IF EXISTS users_select_ranking ON public.users;

-- 검증:
--   SELECT policyname, cmd, roles
--     FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'users'
--    ORDER BY cmd, policyname;
--   → 다음 3건만 남아야 함:
--      users_insert_own  INSERT  {public}
--      users_select_own  SELECT  {public}
--      users_update_own  UPDATE  {public}
