-- public.users — anon SELECT 차단, 본인 row만 SELECT 허용
-- 배경: 기존에 anon 키만으로 전체 users(이메일·사번·이름·부서·마일리지)를
--       전부 조회 가능했음 (PII 노출). 본인 row만 보이도록 RLS 정책을 정비.
-- 영향 분석:
--   - 멤버 레이아웃/대여 목록/가입 완료 페이지: 모두 로그인 사용자가 본인 row만 조회 → 정상 동작
--   - 관리자 검색 API(/api/admin/users/search): service_role 사용 → RLS 우회, 영향 없음
--   - 회원가입 INSERT 정책은 별도이므로 영향 없음
--
-- Supabase Dashboard → SQL Editor 에서 실행

-- 1) RLS 활성화 (이미 켜져있어도 안전)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2) 기존 SELECT 정책 일괄 제거 (anon에 SELECT 허용하는 잘못된 정책 정리)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'users'
       AND cmd        = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- 3) 본인 row만 SELECT (authenticated 한정)
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4) 검증용 안내 (실행 결과로 확인):
--   SELECT policyname, cmd, roles
--     FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'users'
--    ORDER BY cmd;
--   → SELECT 정책은 users_select_own 단 1건이어야 함.
