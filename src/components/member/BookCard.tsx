import Link from "next/link";
import type { Database } from "@/types/database.types";
import { BookStatusBadge } from "./BookStatusBadge";

type Book = Database["public"]["Tables"]["books"]["Row"];

export function BookCard({ book }: { book: Book }) {
  const cover = book.cover_url || book.cover_url_external;

  return (
    <Link href={`/books/${book.id}`} className="group">
      <div className="bg-card rounded-md border overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-[2/3] bg-gradient-to-br from-muted to-border relative">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
              📖
            </div>
          )}
          <div className="absolute top-1 right-1">
            <BookStatusBadge book={book} />
          </div>
        </div>
        <div className="p-2 space-y-0.5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider truncate">
            {book.category}
          </div>
          <div className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {book.author}
          </div>
        </div>
      </div>
    </Link>
  );
}
