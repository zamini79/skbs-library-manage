-- 카테고리에서 '음반' 제거 (book_category enum 5종 → 4종)
--
-- 배경: '음반' 카테고리를 더 이상 사용하지 않음. 해당 카테고리로 등록된 도서는 없음.
-- Postgres 는 enum 값 직접 삭제(ALTER TYPE ... DROP VALUE)를 지원하지 않으므로
-- 타입을 재생성하는 방식으로 처리한다.
--
-- 안전성: books.category 에 '음반' 값이 없으므로 USING 캐스트가 모두 성공한다.
--   (만약 '음반' 행이 있으면 캐스트가 실패하여 트랜잭션이 롤백됨 → 데이터 보호)
-- 의존 객체: idx_books_category 인덱스는 컬럼 타입 변경 시 자동 재생성된다.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

BEGIN;

-- 1) 기존 타입 이름 변경
ALTER TYPE book_category RENAME TO book_category_old;

-- 2) '음반' 없는 새 타입 생성
CREATE TYPE book_category AS ENUM (
  '철학/종교/인문',
  '사회과학',
  '문학',
  '역사/여행'
);

-- 3) books.category 컬럼을 새 타입으로 전환 (text 경유 캐스트)
ALTER TABLE public.books
  ALTER COLUMN category TYPE book_category
  USING category::text::book_category;

-- 4) 기존 타입 제거
DROP TYPE book_category_old;

COMMIT;
