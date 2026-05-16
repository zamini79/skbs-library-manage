"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BOOK_CATEGORIES } from "@/lib/policies";
import { BookCreateSchema } from "@/lib/books-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
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
            ? "이미 등록된 도서일 수 있습니다 (UNIQUE 제약)"
            : data.error || "등록 실패",
        );
        return;
      }
      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">제목 *</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            disabled={submitting}
          />
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
          <Label htmlFor="category">카테고리 *</Label>
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
            Supabase Storage 업로드 기능은 별도 작업으로 분리. 일단 외부 URL만 사용.
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
    </form>
  );
}
