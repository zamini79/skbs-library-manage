-- 연체/만료 알림 메일 발송 중복 방지 테이블
--
-- /api/cron/rental-notifications 가 매일 09:00 KST 에 실행되며,
--   - active/overdue 대여마다 KST 기준 (due_date::date - today::date) 계산
--   - 2/1/0 → due_2/due_1/due_0, 음수 → overdue
--   - 본 테이블에 (rental_id, type, today_KST) INSERT ON CONFLICT DO NOTHING 성공한 경우에만 메일 발송
-- → cron 재시도/중복 호출에도 같은 사용자에게 같은 알림이 두 번 가지 않음.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

CREATE TABLE IF NOT EXISTS public.rental_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id         UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('due_2','due_1','due_0','overdue')),
  sent_for_date     DATE NOT NULL,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rental_id, notification_type, sent_for_date)
);

COMMENT ON TABLE public.rental_notifications IS
  '대여 알림 메일 발송 이력 — 일일 cron 중복 발송 방지';

CREATE INDEX IF NOT EXISTS idx_rental_notifications_rental
  ON public.rental_notifications (rental_id, sent_for_date DESC);

-- RLS: service_role 만 접근 (cron + 관리자 도구)
ALTER TABLE public.rental_notifications ENABLE ROW LEVEL SECURITY;
-- 정책 없음 → authenticated/anon 접근 불가, service_role 만 가능.
