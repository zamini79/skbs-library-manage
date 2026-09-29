-- 도서 카테고리 선택 입력으로 전환 (2026-09-29)
-- 신규 등록을 제목 검색만으로 할 수 있도록 category NOT NULL 을 푼다.
-- NULL 은 화면에서 '미분류' 로 표시되고, 구성원 카테고리 탭에는 잡히지 않는다('전체'에서만 노출).
-- 저자·출판사는 컬럼 NOT NULL 을 유지하고 미입력 시 빈 문자열로 저장한다.
ALTER TABLE public.books ALTER COLUMN category DROP NOT NULL;
