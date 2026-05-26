-- 개인정보 수집·이용 동의 라이프사이클 (1년 보유 + 재동의)
--
-- 요구사항:
--   1) 동의일로부터 1년 보관 후 완전 삭제
--   2) 만료 2주일 전부터 로그인 시 안내 + 재동의 옵션 (재동의 시 1년 재시작)
--   3) 삭제 후 재로그인 시 삭제 안내 + 재가입 유도
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

-- ============ 1) users.consent_given_at 컬럼 추가 ============
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- 기존 회원: created_at 기준으로 backfill (가입일을 동의일로 간주)
UPDATE public.users
   SET consent_given_at = created_at
 WHERE consent_given_at IS NULL;

ALTER TABLE public.users
  ALTER COLUMN consent_given_at SET NOT NULL,
  ALTER COLUMN consent_given_at SET DEFAULT NOW();

COMMENT ON COLUMN public.users.consent_given_at IS
  '개인정보 수집·이용 동의 시각. 동의일로부터 1년 후 자동 삭제 대상.';

-- ============ 2) tombstone 테이블: 삭제된 회원 이메일 ============
-- 재로그인 시 "삭제되었음" 안내만을 위한 최소 정보. PII는 email 만.
CREATE TABLE IF NOT EXISTS public.consent_deletions (
  email      TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.consent_deletions IS
  '동의 만료로 삭제된 회원의 tombstone. 재가입 안내용. service_role 만 접근.';

ALTER TABLE public.consent_deletions ENABLE ROW LEVEL SECURITY;
-- 정책 없음 → anon/authenticated 차단, service_role 만 접근 가능.

-- ============ 3) (옵션) pg_cron 자동 정리 — 운영자가 별도 설치 ============
--
-- Supabase Dashboard → Database → Extensions → pg_cron 활성화 후,
-- 아래 SQL을 SQL Editor 에서 실행하여 매일 03:00 만료 회원 정리 cron 등록:
--
--   SELECT cron.schedule(
--     'consent-cleanup-daily', '0 3 * * *',
--     $$
--       WITH expired AS (
--         SELECT id, email FROM public.users
--          WHERE consent_given_at < NOW() - INTERVAL '1 year'
--       ),
--       tomb AS (
--         INSERT INTO public.consent_deletions (email, deleted_at)
--         SELECT email, NOW() FROM expired
--         ON CONFLICT (email) DO UPDATE SET deleted_at = EXCLUDED.deleted_at
--       )
--       DELETE FROM auth.users WHERE id IN (SELECT id FROM expired);
--     $$
--   );
--
-- cron 미설치 시에도 애플리케이션 레벨의 lazy delete (로그인/페이지 로드 시
-- 만료 감지 → 즉시 삭제 + tombstone 기록)가 1차 방어선 역할.
