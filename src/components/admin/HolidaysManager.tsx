"use client";

// 휴무일 관리 — 자체 휴무일(manual)만 추가·삭제할 수 있고,
// 공공데이터포털 동기화분(api)은 읽기 전용으로 보여준다(다음 동기화 때 되살아나므로).
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type HolidayRow = {
  date: string;
  name: string;
  source: "api" | "manual";
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function weekdayOf(date: string): string {
  return WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";
}

export function HolidaysManager({
  holidays,
  today,
}: {
  holidays: HolidayRow[];
  today: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!date || !name.trim()) {
      setError("날짜와 명칭을 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: name.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "등록에 실패했습니다.");
        return;
      }
      setNotice(
        json.adjusted > 0
          ? `등록했습니다. 반납일이 겹친 대출 ${json.adjusted}건의 기한을 다음 영업일로 옮겼습니다.`
          : "등록했습니다.",
      );
      setDate("");
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(target: string) {
    if (!confirm(`${target} 휴무일을 삭제할까요?\n(이미 옮겨진 반납일은 되돌아가지 않습니다)`))
      return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/holidays?date=${encodeURIComponent(target)}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "삭제에 실패했습니다.");
        return;
      }
      setNotice("삭제했습니다.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const upcoming = holidays.filter((h) => h.date >= today);
  const past = holidays.filter((h) => h.date < today);

  return (
    <div className="space-y-6">
      {/* 등록 폼 */}
      <form
        onSubmit={onAdd}
        className="bg-card border rounded-md p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold">자체 휴무일 추가</h2>
          <p className="text-sm text-muted-foreground mt-1">
            창립기념일·근로자의 날처럼 회사만 쉬는 날을 등록합니다. 법정공휴일은
            매월 자동으로 반영되므로 입력하지 않아도 됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="holiday-date">날짜</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy}
              className="w-[180px]"
            />
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor="holiday-name">명칭</Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              placeholder="예) 창립기념일"
              maxLength={50}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "처리 중..." : "추가"}
          </Button>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {notice && <div className="text-sm text-success">{notice}</div>}
      </form>

      <HolidayTable
        title="다가오는 휴무일"
        rows={upcoming}
        onDelete={onDelete}
        busy={busy}
        emptyText="등록된 휴무일이 없습니다."
      />
      {past.length > 0 && (
        <HolidayTable
          title="지난 휴무일"
          rows={past}
          onDelete={onDelete}
          busy={busy}
          emptyText=""
          muted
        />
      )}
    </div>
  );
}

function HolidayTable({
  title,
  rows,
  onDelete,
  busy,
  emptyText,
  muted = false,
}: {
  title: string;
  rows: HolidayRow[];
  onDelete: (date: string) => void;
  busy: boolean;
  emptyText: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-card border rounded-md p-5 space-y-3">
      <h2 className={`text-lg font-semibold ${muted ? "text-muted-foreground" : ""}`}>
        {title}{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {rows.length}건
        </span>
      </h2>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">{emptyText}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
              <th className="py-2 font-medium w-[160px]">날짜</th>
              <th className="py-2 font-medium">명칭</th>
              <th className="py-2 font-medium w-[120px]">구분</th>
              <th className="py-2 font-medium w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.date} className="border-b last:border-0">
                <td className="py-2 tabular">
                  {h.date}{" "}
                  <span className="text-muted-foreground">
                    ({weekdayOf(h.date)})
                  </span>
                </td>
                <td className="py-2">{h.name}</td>
                <td className="py-2">
                  {h.source === "manual" ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      자체 휴무일
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      법정공휴일
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {h.source === "manual" && (
                    <button
                      type="button"
                      onClick={() => onDelete(h.date)}
                      disabled={busy}
                      aria-label={`${h.date} 삭제`}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-40 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
