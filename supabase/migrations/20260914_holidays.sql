-- 공휴일 테이블 — 반납일(영업일) 계산에 사용.
--
-- 반납일이 토/일 또는 이 테이블의 날짜에 해당하면 다음 평일로 이월한다.
-- 출처 두 가지가 공존한다:
--   'api'    : 공공데이터포털(한국천문연구원 특일정보) 월 1회 동기화분. 동기화가 덮어쓴다.
--   'manual' : 회사 자체 휴무일(창립기념일, 근로자의 날 등) 수동 입력분.
--              동기화는 manual 행을 건드리지 않는다.
--
-- Supabase Dashboard → SQL Editor 에서 한 번 실행.

CREATE TABLE IF NOT EXISTS public.holidays (
  date        DATE PRIMARY KEY,
  name        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'api',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT holidays_source_check CHECK (source IN ('api', 'manual'))
);

COMMENT ON TABLE  public.holidays        IS '공휴일 — 반납일 영업일 계산용';
COMMENT ON COLUMN public.holidays.source IS 'api=공공데이터포털 동기화분(덮어씀) / manual=자체 휴무일(보존)';

-- 조회는 날짜 범위로만 이뤄진다 (PK 인덱스로 충분).

-- RLS: 애플리케이션은 service_role 로만 접근하므로 공개 정책을 두지 않는다.
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_holidays_updated_at ON public.holidays;
CREATE TRIGGER trg_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.touch_holidays_updated_at();

-- 검증:
--   INSERT INTO public.holidays(date, name, source)
--   VALUES ('2026-10-03', '개천절', 'manual')
--   ON CONFLICT (date) DO NOTHING;
--   SELECT * FROM public.holidays ORDER BY date;
