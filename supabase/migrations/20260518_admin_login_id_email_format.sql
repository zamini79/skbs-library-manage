-- 관리자 계정의 login_id를 이메일 형식으로 변경
-- cs_admin       → cs_admin@sk.com
-- book_admin     → book_admin@sk.com
-- Supabase Dashboard → SQL Editor 에서 실행

-- 1) 기존 CHECK 제약 제거 (이전 값만 허용했음)
ALTER TABLE public.admins
  DROP CONSTRAINT IF EXISTS login_id_format;

-- 2) 기존 행 값 업데이트
UPDATE public.admins
   SET login_id = 'cs_admin@sk.com'
 WHERE login_id = 'cs_admin';

UPDATE public.admins
   SET login_id = 'book_admin@sk.com'
 WHERE login_id = 'book_admin';

-- 3) 새 CHECK 제약 추가 (이메일 형식 + 정의된 두 값만 허용)
ALTER TABLE public.admins
  ADD CONSTRAINT login_id_format
    CHECK (login_id IN ('cs_admin@sk.com', 'book_admin@sk.com'));
