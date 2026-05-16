"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import * as xlsx from "xlsx";
import { BookCreateSchema, type BookCreate } from "@/lib/books-schema";
import { BOOK_CATEGORIES } from "@/lib/policies";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ParsedRow = {
  excelRow: number;
  raw: Record<string, unknown>;
  data: BookCreate | null;
  errors: string[];
};

const trim = (v: unknown): string => (v == null ? "" : String(v).trim());

function parseSheet(sheet: xlsx.WorkSheet): ParsedRow[] {
  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  return rows.map((r, i) => {
    const candidate = {
      title: trim(r["제목 *"] ?? r["제목"]),
      author: trim(r["저자"]),
      publisher: trim(r["출판사 *"] ?? r["출판사"]),
      isbn: trim(r["ISBN"]) || null,
      category: trim(r["카테고리 *"] ?? r["카테고리"]),
      price: Number(r["단가"] ?? 0),
      total_quantity: Number(r["수량 *"] ?? r["수량"] ?? 0),
      cover_url: null as string | null,
    };

    const parsed = BookCreateSchema.safeParse(candidate);
    if (parsed.success) {
      return { excelRow: i + 2, raw: r, data: parsed.data, errors: [] };
    }
    const errors = parsed.error.issues.map(
      (iss) => `${iss.path.join(".") || "?"}: ${iss.message}`,
    );
    if (!(BOOK_CATEGORIES as readonly string[]).includes(candidate.category)) {
      if (!errors.find((e) => e.startsWith("category"))) {
        errors.push(`category: "${candidate.category}" 잘못된 값`);
      }
    }
    return { excelRow: i + 2, raw: r, data: null, errors };
  });
}

export function BookBulkUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    failures: Array<{ start: number; end: number; message: string }>;
  } | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = xlsx.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.includes("도서목록")
        ? "도서목록"
        : wb.SheetNames[0];
      const parsed = parseSheet(wb.Sheets[sheetName]);
      setRows(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "파일 파싱 실패");
      setRows([]);
    }
  }

  function reset() {
    setFileName("");
    setRows([]);
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit() {
    const validRows = rows.filter((r) => r.data).map((r) => r.data!);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/books/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        inserted?: number;
        failures?: Array<{ start: number; end: number; message: string }>;
        error?: string;
      };
      setResult({
        inserted: data.inserted ?? 0,
        failures: data.failures ?? (data.error ? [{ start: 0, end: 0, message: data.error }] : []),
      });
      router.refresh();
    } catch (err) {
      setResult({
        inserted: 0,
        failures: [{ start: 0, end: 0, message: err instanceof Error ? err.message : "네트워크 오류" }],
      });
    } finally {
      setSubmitting(false);
    }
  }

  const valid = rows.filter((r) => r.data).length;
  const invalid = rows.length - valid;

  return (
    <div className="space-y-5">
      <div className="space-y-2 max-w-md">
        <Label htmlFor="xlsx">엑셀 파일 (.xlsx)</Label>
        <Input
          ref={fileInputRef}
          id="xlsx"
          type="file"
          accept=".xlsx"
          onChange={onFile}
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          시트명 <span className="font-mono">도서목록</span> 우선 사용, 없으면 첫 시트.
          필수 컬럼: 제목 *, 저자, 출판사 *, 카테고리 *, 단가, 수량 *
        </p>
      </div>

      {parseError && (
        <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
          {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-md">
            <div className="text-sm">
              <span className="text-muted-foreground">파일: </span>
              <span className="font-mono">{fileName}</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span>
                전체 <span className="font-mono font-medium">{rows.length}</span>건
              </span>
              <span className="text-success">
                정상 <span className="font-mono font-medium">{valid}</span>건
              </span>
              {invalid > 0 && (
                <span className="text-destructive">
                  오류 <span className="font-mono font-medium">{invalid}</span>건
                </span>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={submitting}>
                초기화
              </Button>
              <Button
                size="sm"
                onClick={onSubmit}
                disabled={submitting || valid === 0 || result !== null}
              >
                {submitting
                  ? "등록 중..."
                  : `${valid}건 등록${invalid > 0 ? ` (${invalid}건 제외)` : ""}`}
              </Button>
            </div>
          </div>

          {result && (
            <div className="p-4 bg-card border rounded-md space-y-1">
              <div className="text-success text-sm">
                ✓ 적재 완료: <span className="font-mono font-medium">{result.inserted}</span>건
              </div>
              {result.failures.length > 0 && (
                <div className="text-destructive text-sm">
                  ⨯ 실패 배치 {result.failures.length}건:
                  <ul className="font-mono text-xs ml-4 mt-1">
                    {result.failures.map((f, i) => (
                      <li key={i}>
                        rows {f.start}-{f.end}: {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-card border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr className="text-left">
                  <th className="px-3 py-2 w-10 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">제목</th>
                  <th className="px-3 py-2 font-medium">저자</th>
                  <th className="px-3 py-2 font-medium">출판사</th>
                  <th className="px-3 py-2 font-medium">카테고리</th>
                  <th className="px-3 py-2 font-medium text-right">단가</th>
                  <th className="px-3 py-2 font-medium text-right">수량</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = r.data;
                  const bgClass = d ? "" : "bg-destructive-bg/40";
                  return (
                    <tr key={r.excelRow} className={`border-t ${bgClass}`}>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {r.excelRow}
                      </td>
                      <td className="px-3 py-2">
                        {d?.title ?? trim(r.raw["제목 *"] ?? r.raw["제목"]) ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {d?.author ?? trim(r.raw["저자"]) ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {d?.publisher ?? trim(r.raw["출판사 *"] ?? r.raw["출판사"]) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {d?.category ?? trim(r.raw["카테고리 *"] ?? r.raw["카테고리"]) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular">
                        {d ? d.price.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular">
                        {d?.total_quantity ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {d ? (
                          <span className="text-success">✓ 정상</span>
                        ) : (
                          <span className="text-destructive">
                            ⨯ {r.errors.slice(0, 2).join("; ")}
                            {r.errors.length > 2 && ` (+${r.errors.length - 2})`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
