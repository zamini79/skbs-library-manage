type Rental = {
  id: string;
  status: "active" | "overdue" | "returned";
  rented_at: string;
  due_date: string;
  book: { title: string } | null;
  user: { name: string } | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

function statusBadge(s: Rental["status"]) {
  if (s === "overdue") return <span className="badge-overdue">연체</span>;
  if (s === "returned") return <span className="badge-returned">반납</span>;
  return <span className="badge-active">대여중</span>;
}

export function RentalListPanel({
  title,
  rentals,
  emptyText,
  showStatus = true,
}: {
  title: string;
  rentals: Rental[];
  emptyText: string;
  showStatus?: boolean;
}) {
  return (
    <div className="bg-card border rounded-md p-5 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rentals.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ul className="divide-y">
          {rentals.map((r) => (
            <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {r.book?.title ?? "(삭제됨)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.user?.name ?? "?"} · {fmtDate(r.rented_at)} ~ {fmtDate(r.due_date)}
                </div>
              </div>
              {showStatus && <div>{statusBadge(r.status)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
