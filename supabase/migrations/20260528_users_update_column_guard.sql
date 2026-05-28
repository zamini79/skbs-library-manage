-- H1 보안 수정 — 멤버가 본인 mileage/email/is_active 등을 임의로 못 바꾸게 차단
--
-- 배경: users_update_own 정책이 USING (auth.uid() = id) 만 있고 WITH CHECK·컬럼 제한이
--       없어, 로그인 멤버가 anon 클라이언트로 update({ mileage: 999999 }) 처럼 본인 row의
--       임의 컬럼을 직접 수정할 수 있었음 (마일리지 무결성 훼손).
--
-- 멤버가 클라이언트에서 실제로 수정하는 컬럼은 재동의(consent_given_at) 단 하나뿐
--   (src/app/(member)/consent/renew/RenewForm.tsx). 회원가입은 INSERT 경로(users_insert_own).
-- 따라서 authenticated 의 UPDATE 권한을 consent_given_at 컬럼으로만 제한한다.
--
-- 트리거(process_book_return)의 users.mileage 갱신은 테이블 소유자 권한으로 동작하므로
-- 컬럼 GRANT 변경의 영향을 받지 않는다. 관리자 작업은 service_role(RLS·권한 우회)로 처리.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

-- 1) UPDATE 정책 재정의: 본인 row 한정 + WITH CHECK (id 바꿔치기 방지), authenticated 한정
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2) 컬럼 단위 UPDATE 권한 제한 — 멤버(anon/authenticated)는 consent_given_at 만 수정 가능
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (consent_given_at) ON public.users TO authenticated;

-- 검증:
--   SET ROLE authenticated;  (또는 멤버 토큰으로)
--   UPDATE public.users SET mileage = 999999 WHERE id = auth.uid();
--     → ERROR: permission denied for column mileage  (정상)
--   UPDATE public.users SET consent_given_at = now() WHERE id = auth.uid();
--     → 본인 row 1건 갱신 (정상)
