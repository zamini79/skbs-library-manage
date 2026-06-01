-- 15분 경과 pending 대출신청 자동거절을 5분마다 실행.
--
-- Vercel Hobby 플랜은 "하루 1회" 크론만 허용하므로 5분 주기 크론을 vercel.json에 둘 수 없다.
-- 대신 Supabase pg_cron이 DB 함수 expire_stale_rental_requests()를 직접 5분마다 호출한다.
-- (외부 HTTP/시크릿 불필요 — 함수가 모든 로직을 수행)

create extension if not exists pg_cron with schema extensions;

-- 동일 이름 재등록 시 스케줄 갱신(pg_cron 1.4+). 기존 작업이 있으면 먼저 제거.
select cron.unschedule('expire-stale-rental-requests')
where exists (select 1 from cron.job where jobname = 'expire-stale-rental-requests');

select cron.schedule(
  'expire-stale-rental-requests',
  '*/5 * * * *',
  $$ select public.expire_stale_rental_requests(); $$
);
