"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export type MemberRow = {
  id: string;
  name: string;
  employee_no: string;
  email: string;
  department: string;
  is_active: boolean;
  books: Array<{ title: string; overdue: boolean }>;
  hasOverdue: boolean;
  holdingCount: number;
};

type SortCol = "name" | "employee_no" | "email" | "department" | "holding";

export function MembersTable({ members }: { members: MemberRow[] }) {
  const [searchQ, setSearchQ] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === "holding" ? "desc" : "asc");
    }
  }
  function sortIcon(col: SortCol) {
    if (col !== sortCol)
      return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" />
    );
  }

  const displayed = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const filtered = !q
      ? members
      : members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.employee_no.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.department.toLowerCase().includes(q),
        );
    const getKey = (m: MemberRow): string | number => {
      switch (sortCol) {
        case "name":
          return m.name;
        case "employee_no":
          return m.employee_no;
        case "email":
          return m.email;
        case "department":
          return m.department;
        case "holding":
          return m.holdingCount;
        default:
          return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const ka = getKey(a);
      const kb = getKey(b);
      let cmp: number;
      if (typeof ka === "number" && typeof kb === "number") cmp = ka - kb;
      else cmp = String(ka).localeCompare(String(kb), "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, searchQ, sortCol, sortDir]);

  const headerBtn =
    "inline-flex items-center hover:text-foreground transition-colors";

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Input
          type="search"
          placeholder="이름·사번·이메일·팀명 검색"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {displayed.length} / {members.length}
          {searchQ && " (검색)"}
        </span>
      </div>

      <div className="bg-card border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">
                <button type="button" onClick={() => toggleSort("name")} className={headerBtn}>
                  이름{sortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="w-28 whitespace-nowrap">
                <button type="button" onClick={() => toggleSort("employee_no")} className={headerBtn}>
                  사번{sortIcon("employee_no")}
                </button>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <button type="button" onClick={() => toggleSort("email")} className={headerBtn}>
                  이메일{sortIcon("email")}
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button type="button" onClick={() => toggleSort("department")} className={headerBtn}>
                  팀명{sortIcon("department")}
                </button>
              </TableHead>
              <TableHead className="min-w-[220px]">
                <button type="button" onClick={() => toggleSort("holding")} className={headerBtn}>
                  대출 중인 책{sortIcon("holding")}
                </button>
              </TableHead>
              <TableHead className="w-24">연체여부</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((m) => (
                <TableRow key={m.id} className={!m.is_active ? "opacity-50" : undefined}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {m.name}
                    {!m.is_active && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">(비활성)</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono tabular text-xs whitespace-nowrap">
                    {m.employee_no}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                  <TableCell className="text-xs">{m.department}</TableCell>
                  <TableCell>
                    {m.books.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {m.books.map((b, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-sm">
                            <span className="leading-tight">{b.title}</span>
                            {b.overdue && (
                              <span className="badge-overdue text-[10px] shrink-0">연체</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {m.hasOverdue ? (
                      <span className="badge-overdue">연체</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">정상</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
