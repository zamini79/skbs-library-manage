import type { Database } from "@/types/database.types";

type Book = Database["public"]["Tables"]["books"]["Row"];

export function BookStatusBadge({ book }: { book: Pick<Book, "status" | "available_quantity"> }) {
  if (book.status === "disposed") {
    return <span className="badge-returned">폐기</span>;
  }
  if (book.available_quantity > 0) {
    return <span className="badge-available">대출 가능</span>;
  }
  return <span className="badge-active">대출 중</span>;
}
