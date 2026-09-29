// 도서 중복 판별 + 수량 조정 — 신규 등록 시 중복 경고와 수정 다이얼로그의 수량 변경에서 공용 사용.
import type { createAdminClient } from "@/lib/supabase/admin";

type Client = ReturnType<typeof createAdminClient>;

// tsconfig target 이 ES5 라 u 플래그 리터럴을 못 써서 생성자로 만든다.
const NON_WORD = new RegExp("[\\s\\p{P}\\p{S}]", "gu");

/**
 * 비교용 정규화 — 대소문자·공백·문장부호 차이를 무시한다 ("말 그릇" = "말그릇").
 */
function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(NON_WORD, "");
}

/**
 * 저자 비교용 — "지음/옮김/저" 같은 역할 표기와 공동저자·역자 뒷부분을 떼고 대표 저자만 남긴다.
 * ("제인 오스틴 지음, 김선형 옮김" → "제인오스틴", "양귀자 지음" → "양귀자")
 */
function normalizeAuthor(s: string | null | undefined): string {
  const first = (s ?? "").split(/[,·/]/)[0] ?? "";
  return normalize(first.replace(/\s*(지음|엮음|옮김|글|저|편|역)\s*$/, ""));
}

function sameAuthor(a: string, b: string): boolean {
  const x = normalizeAuthor(a);
  const y = normalizeAuthor(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export type DuplicateBook = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  isbn: string | null;
  total_quantity: number;
  available_quantity: number;
  /** 출판사까지 같으면 true (같은 판본), 다르면 다른 출판사 판본일 수 있음 */
  same_publisher: boolean;
};

/**
 * 제목(정규화)이 같고 대표 저자가 같은 활성 도서를 찾는다.
 * ISBN 은 기준으로 쓰지 않는다 — 자동 조회된 ISBN 이 시리즈 권차끼리 겹치는 경우가 있어
 * (예: 먼나라 이웃나라 1권·23권) 오탐이 난다.
 */
export async function findDuplicateBooks(
  supabase: Client,
  input: { title: string; author: string; publisher: string },
): Promise<DuplicateBook[]> {
  const title = normalize(input.title);
  if (!title) return [];

  // 제목 앞 글자로 후보를 좁힌 뒤 정규화 비교는 Node 에서 한다 (공백 차이는 SQL ilike 로 못 잡음).
  const head = Array.from(title)[0];
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, publisher, isbn, total_quantity, available_quantity")
    .eq("status", "active")
    .ilike("title", `%${head}%`)
    .limit(1000);
  if (error) throw new Error(error.message);

  const publisher = normalize(input.publisher);
  return (data ?? [])
    .filter((b) => normalize(b.title) === title && sameAuthor(b.author, input.author))
    .map((b) => ({ ...b, same_publisher: normalize(b.publisher) === publisher }))
    .sort((a, b) => Number(b.same_publisher) - Number(a.same_publisher));
}

export type QuantityChange = { total: number } | { add: number };

export type QuantityResult =
  | { ok: true; total_quantity: number; available_quantity: number }
  | { ok: false; error: "NOT_FOUND" | "DISPOSED" | "BELOW_RENTED" | "INVALID" | "CONFLICT"; rented?: number };

const MAX_RETRY = 3;

/**
 * 총 수량을 바꾸고 가용 수량을 같은 차이만큼 맞춘다. 대출 중인 권수보다 작게는 줄일 수 없다.
 * 대여/반납 트리거가 available_quantity 를 동시에 바꿀 수 있으므로 읽은 값이 그대로일 때만
 * 갱신하고(낙관적 잠금), 그 사이 바뀌었으면 다시 읽어 재시도한다.
 */
export async function changeBookQuantity(
  supabase: Client,
  bookId: string,
  change: QuantityChange,
): Promise<QuantityResult> {
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const { data: cur, error } = await supabase
      .from("books")
      .select("total_quantity, available_quantity, status")
      .eq("id", bookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cur) return { ok: false, error: "NOT_FOUND" };
    if (cur.status !== "active") return { ok: false, error: "DISPOSED" };

    const total = "total" in change ? change.total : cur.total_quantity + change.add;
    if (!Number.isInteger(total) || total < 1) return { ok: false, error: "INVALID" };

    const rented = cur.total_quantity - cur.available_quantity;
    if (total < rented) return { ok: false, error: "BELOW_RENTED", rented };

    const available = cur.available_quantity + (total - cur.total_quantity);
    if (total === cur.total_quantity) {
      return { ok: true, total_quantity: total, available_quantity: available };
    }

    const { data: updated, error: upErr } = await supabase
      .from("books")
      .update({ total_quantity: total, available_quantity: available })
      .eq("id", bookId)
      .eq("total_quantity", cur.total_quantity)
      .eq("available_quantity", cur.available_quantity)
      .select("id");
    if (upErr) throw new Error(upErr.message);
    if (updated && updated.length === 1) {
      return { ok: true, total_quantity: total, available_quantity: available };
    }
  }
  return { ok: false, error: "CONFLICT" };
}

export function quantityErrorMessage(r: Extract<QuantityResult, { ok: false }>): string {
  switch (r.error) {
    case "NOT_FOUND":
      return "도서를 찾을 수 없습니다.";
    case "DISPOSED":
      return "폐기된 도서는 수량을 바꿀 수 없습니다.";
    case "BELOW_RENTED":
      return `현재 ${r.rented}권이 대출 중이라 ${r.rented}권 미만으로 줄일 수 없습니다.`;
    case "INVALID":
      return "수량은 1 이상의 정수여야 합니다.";
    case "CONFLICT":
      return "다른 대출/반납 처리와 겹쳤습니다. 잠시 후 다시 시도해주세요.";
  }
}
