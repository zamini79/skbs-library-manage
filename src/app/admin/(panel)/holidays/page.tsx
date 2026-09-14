// 관리자 — 휴무일 관리 (master 전용)
//
// 법정공휴일은 공공데이터포털 동기화로 자동 반영되고(읽기 전용),
// 회사 자체 휴무일만 이 화면에서 추가·삭제한다.
import { requireMaster } from "@/lib/auth/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { kstShiftDays, kstToday } from "@/lib/kst";
import {
  HolidaysManager,
  type HolidayRow,
} from "@/components/admin/HolidaysManager";

export const dynamic = "force-dynamic";

export default async function AdminHolidaysPage() {
  await requireMaster();
  const supabase = createAdminClient();

  const today = kstToday();
  // 지난 휴무일은 최근 것만 보여주면 충분하다(이력 확인 용도).
  const { data } = await supabase
    .from("holidays")
    .select("date, name, source")
    .gte("date", kstShiftDays(today, -180))
    .order("date", { ascending: true });

  const holidays = (data ?? []) as HolidayRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">휴무일 관리</h1>
        <p className="text-md text-muted-foreground mt-1">
          반납일이 주말·휴무일이면 다음 영업일로 자동 이월됩니다.
        </p>
      </header>

      <HolidaysManager holidays={holidays} today={today} />
    </div>
  );
}
