import Link from "next/link";
import type { Database } from "@/types/database.types";
import { BookCover } from "./BookCover";

type Book = Database["public"]["Tables"]["books"]["Row"];

export function BookCard({ book }: { book: Book }) {
  const available = book.available_quantity > 0;

  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex flex-col gap-3.5 cursor-pointer"
    >
      <div className="relative self-center w-full max-w-[170px]">
        <div className="transition-transform duration-[250ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] group-hover:-translate-y-1">
          <BookCover book={book} width={170} fluid />
        </div>

        {/* availability badge — 표지 우상단 pill */}
        {available ? (
          <span className="absolute top-2.5 right-2.5 inline-block rounded-pill bg-ok text-white text-[10px] font-bold tracking-wide px-2 py-0.5">
            대출 가능
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 inline-block rounded-pill bg-white/95 text-busy text-[10px] font-bold tracking-wide px-2 py-0.5">
            대출중
          </span>
        )}
      </div>

      <div className="px-1">
        <div className="text-[11px] text-ink-muted tracking-wide">
          {book.category}
        </div>
        <div className="font-serif text-[15px] font-bold text-ink leading-tight line-clamp-2 mt-1 group-hover:text-library-accent transition-colors">
          {book.title}
        </div>
        <div className="text-xs text-ink-soft mt-1 truncate">{book.author}</div>
      </div>
    </Link>
  );
}
