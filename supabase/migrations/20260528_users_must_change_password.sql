-- 기존 시스템에서 이관된 사용자(비밀번호 미설정 상태) 표시 + 강제 비번 변경 유도용 플래그
--
-- 이관 스크립트가 사용자 생성 시 TRUE 로 채움.
-- 멤버 레이아웃이 이 플래그를 보고 /change-password 로 리다이렉트.
-- ChangePasswordForm 이 성공 후 FALSE 로 클리어.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.must_change_password IS
  '레거시 이관 계정 표시 — TRUE 이면 첫 로그인 후 /change-password 로 강제 이동';
