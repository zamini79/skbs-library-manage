// 도서 입력 공유 스키마 — 수동 폼과 엑셀 일괄 업로드 양쪽에서 사용.
import { z } from "zod";
import { BOOK_CATEGORIES } from "@/lib/policies";

const CATEGORY_TUPLE = BOOK_CATEGORIES as readonly string[] as [
  string,
  ...string[],
];

export const BookCreateSchema = z.object({
  title: z.string().trim().min(1, "제목 필수").max(500),
  // 저자·출판사·카테고리는 선택 입력 (제목 검색으로 채우거나 비워둘 수 있음).
  // 저자·출판사는 DB NOT NULL 이라 미입력 시 빈 문자열, 카테고리는 NULL(미분류).
  author: z.string().trim().max(200).optional().default(""),
  publisher: z.string().trim().max(200).optional().default(""),
  isbn: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  category: z
    .enum(CATEGORY_TUPLE)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null))
    .transform((v) => v ?? null),
  price: z.number().int("정수").min(0, "0 이상"),
  total_quantity: z.number().int("정수").min(1, "1 이상"),
  cover_url: z
    .string()
    .trim()
    .max(2048)
    .url("올바른 URL이 아닙니다")
    .refine((u) => /^https:\/\//i.test(u), "https:// URL만 허용됩니다")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type BookCreate = z.infer<typeof BookCreateSchema>;

// 도서 수정 — 메타데이터 + 총 수량. 수량 변경 시 가용 수량은 서버가 같은 차이만큼 맞춘다
// (lib/book-inventory.ts changeBookQuantity).
export const BookUpdateSchema = BookCreateSchema;

export type BookUpdate = z.infer<typeof BookUpdateSchema>;
