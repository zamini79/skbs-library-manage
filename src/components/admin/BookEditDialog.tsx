"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database.types";
import { BOOK_CATEGORIES } from "@/lib/policies";
import { BookUpdateSchema } from "@/lib/books-schema";
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

type Book = Database["public"]["Tables"]["books"]["Row"];

type FormState = {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  category: string;
  price: string;
  cover_url: string;
};

function fromBook(book: Book): FormState {
  return {
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    isbn: book.isbn ?? "",
    category: book.category,
    price: String(book.price),
    cover_url: book.cover_url ?? "",
  };
}

/**
 * 표지 미리보기 — 입력한 URL(수동) 우선, 없으면 자동 조회된 표지를 보여준다.
 * 로드 실패(잘못된 URL·삭제된 이미지)는 안내 문구로 대체해 깨진 이미지가 남지 않게 한다.
 */
function CoverPreview({ url, auto }: { url: string | null; auto: boolean }) {
  const [failed, setFailed] = useState(false);
  const box =
    "w-[76px] shrink-0 rounded border border-line bg-bg flex items-center justify-center text-center text-[10px] leading-tight text-ink-muted overflow-hidden";
  const ratio = { aspectRatio: "1 / 1.45" };

  if (!url) {
    return (
      <div className={box} style={ratio}>
        표지
        <br />
        없음
      </div>
    );
  }
  if (failed) {
    return (
      <div className={box} style={ratio}>
        불러오기
        <br />
        실패
      </div>
    );
  }
  return (
    <div className="shrink-0">
      <div className={box} style={ratio}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="표지 미리보기"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="mt-1 text-center text-[10px] text-ink-muted">
        {auto ? "자동 조회" : "직접 지정"}
      </div>
    </div>
  );
}

export function BookEditDialog({ book }: { book: Book }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => fromBook(book));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onOpenChange(next: boolean) {
    if (next) {
      // 열 때마다 현재 도서 값으로 초기화 (이전 편집 잔상 제거)
      setForm(fromBook(book));
      setError(null);
    }
    setOpen(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = {
      title: form.title,
      author: form.author,
      publisher: form.publisher,
      isbn: form.isbn || null,
      category: form.category,
      price: Number(form.price),
      cover_url: form.cover_url || null,
    };

    const parsed = BookUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        setError(
          data.code === "23505"
            ? "이미 등록된 도서와 충돌합니다 (UNIQUE 제약)"
            : data.error || "수정 실패",
        );
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        수정
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>도서 정보 수정</DialogTitle>
            <DialogDescription className="truncate">
              {book.title}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-title">제목 *</Label>
                <Input
                  id="edit-title"
                  required
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-author">저자 *</Label>
                <Input
                  id="edit-author"
                  required
                  value={form.author}
                  onChange={(e) => update("author", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-publisher">출판사 *</Label>
                <Input
                  id="edit-publisher"
                  required
                  value={form.publisher}
                  onChange={(e) => update("publisher", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-isbn">ISBN</Label>
                <Input
                  id="edit-isbn"
                  value={form.isbn}
                  onChange={(e) => update("isbn", e.target.value)}
                  disabled={submitting}
                  placeholder="(선택)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">카테고리 *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => update("category", v)}
                  disabled={submitting}
                >
                  <SelectTrigger id="edit-category">
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
                <Label htmlFor="edit-price">단가 (원)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  step={100}
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-cover">표지 이미지 URL</Label>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      id="edit-cover"
                      type="url"
                      value={form.cover_url}
                      onChange={(e) => update("cover_url", e.target.value)}
                      disabled={submitting}
                      placeholder="https://... (선택, 외부 URL)"
                    />
                    {/* 자동 조회된 표지(cover_url_external)는 별도 컬럼이라 위 입력칸에 뜨지 않는다.
                        비워두면 이 자동 표지가 구성원 화면에 노출되므로 현재 상태를 안내한다. */}
                    <p className="text-xs text-ink-muted">
                      {form.cover_url.trim() ? (
                        <>
                          직접 입력한 표지가 우선 표시됩니다.
                          {book.cover_url_external && " (자동 조회 표지는 미사용)"}
                        </>
                      ) : book.cover_url_external ? (
                        "자동 조회된 표지가 사용 중입니다. 직접 지정하려면 URL을 입력하세요."
                      ) : (
                        "표지가 없습니다. 자동 조회에 실패했으므로 URL을 직접 입력해 주세요."
                      )}
                    </p>
                  </div>
                  {/* 미리보기 — 직접 입력값 우선, 없으면 자동 조회 표지 (구성원 화면과 동일 우선순위) */}
                  <CoverPreview
                    url={form.cover_url.trim() || book.cover_url_external}
                    auto={!form.cover_url.trim() && !!book.cover_url_external}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
