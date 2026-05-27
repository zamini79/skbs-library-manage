// 도서 입력 공유 스키마 — 수동 폼과 엑셀 일괄 업로드 양쪽에서 사용.
import { z } from "zod";
import { BOOK_CATEGORIES } from "@/lib/policies";

const CATEGORY_TUPLE = BOOK_CATEGORIES as readonly string[] as [
  string,
  ...string[],
];

export const BookCreateSchema = z.object({
  title: z.string().trim().min(1, "제목 필수").max(500),
  author: z.string().trim().min(1, "저자 필수").max(200),
  publisher: z.string().trim().min(1, "출판사 필수").max(200),
  isbn: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  category: z.enum(CATEGORY_TUPLE),
  price: z.number().int("정수").min(0, "0 이상"),
  total_quantity: z.number().int("정수").min(1, "1 이상"),
  cover_url: z
    .string()
    .trim()
    .max(2048)
    .url("올바른 URL이 아닙니다")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type BookCreate = z.infer<typeof BookCreateSchema>;

// 도서 수정 — 메타데이터만. 수량(total_quantity)은 available_quantity 파생값과
// 얽혀 있어 별도 관리하므로 수정 대상에서 제외.
export const BookUpdateSchema = BookCreateSchema.omit({ total_quantity: true });

export type BookUpdate = z.infer<typeof BookUpdateSchema>;
