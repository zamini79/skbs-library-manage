-- 책 소개 및 줄거리 컬럼 추가 (Kakao Book Search의 contents 필드 저장용)
-- Supabase Dashboard → SQL Editor 에서 실행
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.books.description IS '책 소개·줄거리 (Kakao Book Search contents 또는 수동 입력)';
