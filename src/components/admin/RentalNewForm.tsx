"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Book = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  available_quantity: number;
  total_quantity: number;
};

type User = {
  id: string;
  email: string;
  name: string;
  employee_no: string;
  department: string;
  mileage: number;
};

type Eligibility = {
  eligible: boolean;
  book_available: boolean;
  book_active: boolean;
  monthly_count: number;
  monthly_remaining: number;
  current_holding: number;
  holding_remaining: number;
  overdue_count: number;
  has_overdue: boolean;
  cooldown_until: string | null;
  in_cooldown: boolean;
  cooldown_days_remaining: number;
};

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${ok ? "text-success" : "text-destructive"}`}>
      <span>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </li>
  );
}

export function RentalNewForm() {
  const router = useRouter();

  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [elig, setElig] = useState<Eligibility | null>(null);
  const [eligLoading, setEligLoading] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; due_date: string } | null>(null);

  const debouncedBookQuery = useDebounce(bookQuery, 300);
  const debouncedUserQuery = useDebounce(userQuery, 300);

  // 도서 검색
  useEffect(() => {
    if (selectedBook || debouncedBookQuery.length === 0) {
      setBookResults([]);
      return;
    }
    setBookLoading(true);
    fetch(`/api/admin/books/search?q=${encodeURIComponent(debouncedBookQuery)}`)
      .then((r) => r.json())
      .then((d) => setBookResults(d.books ?? []))
      .finally(() => setBookLoading(false));
  }, [debouncedBookQuery, selectedBook]);

  // 사용자 검색
  useEffect(() => {
    if (selectedUser || debouncedUserQuery.length === 0) {
      setUserResults([]);
      return;
    }
    setUserLoading(true);
    fetch(`/api/admin/users/search?q=${encodeURIComponent(debouncedUserQuery)}`)
      .then((r) => r.json())
      .then((d) => setUserResults(d.users ?? []))
      .finally(() => setUserLoading(false));
  }, [debouncedUserQuery, selectedUser]);

  // eligibility 자동 검증
  useEffect(() => {
    if (!selectedBook || !selectedUser) {
      setElig(null);
      return;
    }
    setEligLoading(true);
    fetch(
      `/api/admin/rentals/check?user_id=${selectedUser.id}&book_id=${selectedBook.id}`,
    )
      .then((r) => r.json())
      .then((d) => setElig(d.eligibility ?? null))
      .finally(() => setEligLoading(false));
  }, [selectedBook, selectedUser]);

  async function onSubmit() {
    if (!selectedBook || !selectedUser || !elig?.eligible) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/admin/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          book_id: selectedBook.id,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        id?: string;
        due_date?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setSubmitError(data.error || "대출 처리 실패");
        return;
      }
      setSuccess({ id: data.id!, due_date: data.due_date! });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBookQuery("");
    setBookResults([]);
    setSelectedBook(null);
    setUserQuery("");
    setUserResults([]);
    setSelectedUser(null);
    setElig(null);
    setSuccess(null);
    setSubmitError(null);
  }

  if (success) {
    return (
      <div className="bg-card border rounded-md p-8 text-center space-y-4 max-w-lg">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-bold">대출 처리 완료</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            반납기한:{" "}
            <span className="font-mono font-medium text-foreground">
              {new Date(success.due_date).toLocaleString("ko-KR")}
            </span>
          </div>
          <div className="font-mono text-xs">rental_id: {success.id}</div>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={reset}>새 대출 등록</Button>
          <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
            대시보드로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* 좌측: 도서 검색 */}
      <div className="space-y-3">
        <Label htmlFor="book-q">도서 검색</Label>
        {selectedBook ? (
          <div className="bg-card border rounded-md p-4 space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {selectedBook.category}
            </div>
            <div className="font-medium">{selectedBook.title}</div>
            <div className="text-xs text-muted-foreground">
              {selectedBook.author} · {selectedBook.publisher}
            </div>
            <div className="text-xs text-success">
              가용 {selectedBook.available_quantity}/{selectedBook.total_quantity}권
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedBook(null)}>
              변경
            </Button>
          </div>
        ) : (
          <>
            <Input
              id="book-q"
              placeholder="제목·저자·출판사로 검색 (가용 도서만)"
              value={bookQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBookQuery(e.target.value)}
            />
            <div className="bg-card border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {bookLoading && (
                <div className="p-3 text-sm text-muted-foreground">검색 중...</div>
              )}
              {!bookLoading && bookResults.length === 0 && bookQuery && (
                <div className="p-3 text-sm text-muted-foreground">결과 없음</div>
              )}
              {bookResults.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBook(b)}
                  className="w-full text-left p-3 hover:bg-muted transition-colors"
                >
                  <div className="text-sm font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.author} · {b.publisher} ·{" "}
                    <span className="text-success">가용 {b.available_quantity}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 우측: 사용자 검색 */}
      <div className="space-y-3">
        <Label htmlFor="user-q">대출자 검색</Label>
        {selectedUser ? (
          <div className="bg-card border rounded-md p-4 space-y-1">
            <div className="font-medium">{selectedUser.name}</div>
            <div className="text-xs text-muted-foreground">
              {selectedUser.department} · 사번 {selectedUser.employee_no}
            </div>
            <div className="text-xs font-mono">{selectedUser.email}</div>
            <div className="text-xs text-muted-foreground">
              마일리지 {selectedUser.mileage.toLocaleString()}점
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              변경
            </Button>
          </div>
        ) : (
          <>
            <Input
              id="user-q"
              placeholder="이름·사번·이메일로 검색"
              value={userQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUserQuery(e.target.value)}
            />
            <div className="bg-card border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {userLoading && (
                <div className="p-3 text-sm text-muted-foreground">검색 중...</div>
              )}
              {!userLoading && userResults.length === 0 && userQuery && (
                <div className="p-3 text-sm text-muted-foreground">결과 없음</div>
              )}
              {userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className="w-full text-left p-3 hover:bg-muted transition-colors"
                >
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.department} · {u.employee_no} · {u.email}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 검증 결과 패널 (가로 전체) */}
      <div className="lg:col-span-2">
        {!selectedBook || !selectedUser ? (
          <div className="bg-muted rounded-md p-6 text-center text-sm text-muted-foreground">
            도서와 대출자를 모두 선택하면 정책 검증 결과가 표시됩니다.
          </div>
        ) : eligLoading ? (
          <div className="bg-card border rounded-md p-6 text-center text-sm text-muted-foreground">
            정책 검증 중...
          </div>
        ) : elig ? (
          <div className="bg-card border rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">정책 검증</h3>
              <span
                className={
                  elig.eligible ? "badge-available text-sm" : "badge-overdue text-sm"
                }
              >
                {elig.eligible ? "대출 가능" : "대출 불가"}
              </span>
            </div>
            <ul className="space-y-2">
              <Check ok={elig.book_active} label="도서 운영 상태 (active)" />
              <Check ok={elig.book_available} label="도서 가용 수량 > 0" />
              <Check
                ok={elig.monthly_remaining > 0}
                label={`이번 달 대출 잔여 ${elig.monthly_remaining}회 (현재 ${elig.monthly_count}/2)`}
              />
              <Check
                ok={elig.holding_remaining > 0}
                label={`동시 보유 잔여 ${elig.holding_remaining}권 (현재 ${elig.current_holding}/2)`}
              />
              <Check ok={!elig.has_overdue} label={`연체 보유 없음 (현재 ${elig.overdue_count}건)`} />
              <Check
                ok={!elig.in_cooldown}
                label={
                  elig.in_cooldown && elig.cooldown_until
                    ? `연체 쿨다운 잔여 ${elig.cooldown_days_remaining}일 (~${new Date(elig.cooldown_until).toLocaleDateString("ko-KR")} 까지)`
                    : "연체 쿨다운 없음"
                }
              />
            </ul>

            {submitError && (
              <div className="text-sm text-destructive bg-destructive-bg px-3 py-2 rounded">
                {submitError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={onSubmit} disabled={!elig.eligible || submitting}>
                {submitting ? "처리 중..." : "대출 처리"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={submitting}>
                초기화
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
