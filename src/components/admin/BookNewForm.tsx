"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { BOOK_CATEGORIES } from "@/lib/policies";
import { BookCreateSchema } from "@/lib/books-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  category: string;
  price: string;
  total_quantity: string;
  cover_url: string;
};

type SearchResult = {
  title: string;
  author: string;
  publisher: string;
  isbn: string | null;
  price: number | null;
  cover: string | null;
  published: string | null;
};

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: SearchResult[] }
  | { status: "error"; message: string };

type Duplicate = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  isbn: string | null;
  total_quantity: number;
  available_quantity: number;
  same_publisher: boolean;
};

type DuplicateState = {
  sameEdition: boolean;
  duplicates: Duplicate[];
  /** 기존 도서에 추가할 권수 (기본값: 폼에 입력한 수량) */
  add: string;
  busy: boolean;
  error: string | null;
  /** 수량 추가 완료 결과 */
  done: { title: string; total: number; available: number } | null;
};

const EMPTY: FormState = {
  title: "",
  author: "",
  publisher: "",
  isbn: "",
  category: "",
  price: "0",
  total_quantity: "1",
  cover_url: "",
};

export function BookNewForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dup, setDup] = useState<DuplicateState | null>(null);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  /** 검색 결과에서 고른 항목 — 카테고리 입력 안내에 쓴다 */
  const [picked, setPicked] = useState<SearchResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // 제목으로 외부 도서 검색 (Kakao → Naver) — 결과를 고르면 저자·출판사·ISBN·단가가 채워진다.
  async function runSearch() {
    const q = form.title.trim();
    if (!q) {
      setSearch({ status: "error", message: "제목을 먼저 입력해주세요." });
      return;
    }
    setSearch({ status: "loading" });
    try {
      const res = await fetch(`/api/admin/books/lookup?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { ok?: boolean; results?: SearchResult[] };
      if (!res.ok || !data.ok) {
        setSearch({ status: "error", message: "검색에 실패했습니다. 직접 입력해주세요." });
        return;
      }
      setSearch({ status: "done", results: data.results ?? [] });
    } catch {
      setSearch({ status: "error", message: "네트워크 오류로 검색하지 못했습니다." });
    }
  }

  function applyResult(r: SearchResult) {
    setForm((p) => ({
      ...p,
      title: r.title,
      author: r.author || p.author,
      publisher: r.publisher || p.publisher,
      isbn: r.isbn ?? p.isbn,
      price: r.price !== null ? String(r.price) : p.price,
    }));
    setPicked(r);
    setSearch({ status: "idle" });
    setError(null);
  }

  // 제목 칸에서 Enter = 검색 (등록 제출 아님)
  function onTitleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void runSearch();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void register(false);
  }

  async function register(allowDuplicate: boolean) {
    setError(null);

    const candidate = {
      title: form.title,
      author: form.author,
      publisher: form.publisher,
      isbn: form.isbn || null,
      category: form.category,
      price: Number(form.price),
      total_quantity: Number(form.total_quantity),
      cover_url: form.cover_url || null,
    };

    const parsed = BookCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, allow_duplicate: allowDuplicate }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        same_edition?: boolean;
        duplicates?: Duplicate[];
      };
      if (res.status === 409 && data.error === "DUPLICATE") {
        setDup({
          sameEdition: !!data.same_edition,
          duplicates: data.duplicates ?? [],
          add: String(parsed.data.total_quantity),
          busy: false,
          error: null,
          done: null,
        });
        return;
      }
      if (!res.ok || !data.ok) {
        setError(
          data.code === "23505"
            ? "이미 등록된 도서일 수 있습니다 (UNIQUE 제약)"
            : data.error || "등록 실패",
        );
        return;
      }
      setDup(null);
      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  // 중복 발견 시 — 새로 등록하지 않고 기존 도서의 수량을 늘린다.
  async function addToExisting(book: Duplicate) {
    if (!dup) return;
    const add = Number(dup.add);
    if (!Number.isInteger(add) || add < 1) {
      setDup({ ...dup, error: "추가할 권수는 1 이상의 정수여야 합니다." });
      return;
    }
    setDup({ ...dup, busy: true, error: null });
    try {
      const res = await fetch(`/api/admin/books/${book.id}/quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        total_quantity?: number;
        available_quantity?: number;
      };
      if (!res.ok || !data.ok) {
        setDup({ ...dup, busy: false, error: data.message || data.error || "수량 추가 실패" });
        return;
      }
      setDup({
        ...dup,
        busy: false,
        done: {
          title: book.title,
          total: data.total_quantity ?? book.total_quantity + add,
          available: data.available_quantity ?? book.available_quantity + add,
        },
      });
      router.refresh();
    } catch (err) {
      setDup({ ...dup, busy: false, error: err instanceof Error ? err.message : "네트워크 오류" });
    }
  }

  function closeDup() {
    if (dup?.busy || submitting) return;
    setDup(null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">제목 *</Label>
          <div className="flex gap-2">
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              onKeyDown={onTitleKeyDown}
              disabled={submitting}
              placeholder="제목 입력 후 검색 (Enter)"
            />
            <Button
              type="button"
              variant="outline"
              onClick={runSearch}
              disabled={submitting || search.status === "loading"}
              className="shrink-0"
            >
              <Search className="h-4 w-4 mr-1" />
              {search.status === "loading" ? "검색 중..." : "검색"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            검색 결과를 고르면 저자·출판사·ISBN·단가가 자동으로 채워집니다. 카테고리는 직접 선택해주세요.
          </p>

          {search.status === "error" && (
            <p className="text-xs text-destructive">{search.message}</p>
          )}
          {search.status === "done" && (
            <div className="border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b text-xs text-muted-foreground">
                <span>
                  검색 결과 <span className="tabular">{search.results.length}</span>건
                </span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setSearch({ status: "idle" })}
                >
                  닫기
                </button>
              </div>
              {search.results.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  검색 결과가 없습니다. 직접 입력해주세요.
                </p>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y">
                  {search.results.map((r, i) => (
                    <li key={`${r.isbn ?? r.title}-${i}`}>
                      <button
                        type="button"
                        onClick={() => applyResult(r)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <div
                          className="w-9 shrink-0 rounded border bg-muted overflow-hidden"
                          style={{ aspectRatio: "1 / 1.45" }}
                        >
                          {r.cover && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.cover} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.author || "저자 미상"} · {r.publisher || "출판사 미상"}
                            {r.published && ` · ${r.published.slice(0, 4)}`}
                          </div>
                        </div>
                        <span className="text-xs text-primary shrink-0">선택</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">저자 *</Label>
          <Input
            id="author"
            required
            value={form.author}
            onChange={(e) => update("author", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publisher">출판사 *</Label>
          <Input
            id="publisher"
            required
            value={form.publisher}
            onChange={(e) => update("publisher", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="isbn">ISBN</Label>
          <Input
            id="isbn"
            value={form.isbn}
            onChange={(e) => update("isbn", e.target.value)}
            disabled={submitting}
            placeholder="(선택)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">
            카테고리 *
            {picked && !form.category && (
              <span className="ml-2 text-xs font-normal text-primary">← 선택해주세요</span>
            )}
          </Label>
          <Select
            value={form.category}
            onValueChange={(v) => update("category", v)}
            disabled={submitting}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {BOOK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">단가 (원)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={100}
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_quantity">수량 *</Label>
          <Input
            id="total_quantity"
            type="number"
            min={1}
            value={form.total_quantity}
            onChange={(e) => update("total_quantity", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cover_url">표지 이미지 URL</Label>
          <Input
            id="cover_url"
            type="url"
            value={form.cover_url}
            onChange={(e) => update("cover_url", e.target.value)}
            disabled={submitting}
            placeholder="https://... (선택, 외부 URL)"
          />
          <p className="text-xs text-muted-foreground">
            비워두면 등록 후 표지를 자동으로 찾아 채웁니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "등록 중..." : "도서 등록"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/books")}
          disabled={submitting}
        >
          취소
        </Button>
      </div>

      <Dialog open={dup !== null} onOpenChange={(o) => !o && closeDup()}>
        <DialogContent>
          {dup?.done ? (
            <>
              <DialogHeader>
                <DialogTitle>수량을 늘렸습니다</DialogTitle>
                <DialogDescription>
                  「{dup.done.title}」 총 {dup.done.total}권 (대출 가능 {dup.done.available}권)
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDup(null);
                    setForm(EMPTY);
                    setPicked(null);
                  }}
                >
                  다른 도서 등록
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setDup(null);
                    router.push("/admin/books");
                  }}
                >
                  도서 목록으로
                </Button>
              </DialogFooter>
            </>
          ) : dup ? (
            <>
              <DialogHeader>
                <DialogTitle>이미 등록된 도서가 있습니다</DialogTitle>
                <DialogDescription>
                  {dup.sameEdition
                    ? "같은 도서는 중복 등록할 수 없습니다. 같은 책을 더 들여왔다면 기존 도서의 수량을 늘려주세요."
                    : "제목과 저자가 같은 도서가 있습니다. 출판사가 달라 다른 판본일 수 있습니다."}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-2">
                {dup.duplicates.map((d) => (
                  <li
                    key={d.id}
                    className="border rounded-md p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.author} · {d.publisher}
                        {!d.same_publisher && (
                          <span className="ml-1 text-primary">(출판사 다름)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        보유 <span className="tabular">{d.total_quantity}</span>권 · 대출 가능{" "}
                        <span className="tabular">{d.available_quantity}</span>권
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={d.same_publisher ? "default" : "outline"}
                      onClick={() => addToExisting(d)}
                      disabled={dup.busy}
                    >
                      +{dup.add || "?"}권 추가
                    </Button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="dup-add" className="shrink-0">
                  추가할 권수
                </Label>
                <Input
                  id="dup-add"
                  type="number"
                  min={1}
                  max={100}
                  value={dup.add}
                  onChange={(e) => setDup({ ...dup, add: e.target.value, error: null })}
                  disabled={dup.busy}
                  className="w-24"
                />
              </div>

              {dup.error && (
                <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
                  {dup.error}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDup}
                  disabled={dup.busy || submitting}
                >
                  취소
                </Button>
                {!dup.sameEdition && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => register(true)}
                    disabled={dup.busy || submitting}
                  >
                    {submitting ? "등록 중..." : "다른 판본으로 새로 등록"}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </form>
  );
}
