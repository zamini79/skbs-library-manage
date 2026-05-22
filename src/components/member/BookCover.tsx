// 책 표지 컴포넌트.
//   - book.cover_url 또는 book.cover_url_external 있으면 그대로 렌더
//   - 없으면 책 id 기반 deterministic placeholder (palette × style)
//
// 디자인 핸드오프의 4가지 coverStyle을 inline-style로 구현.
// palette는 책 id 해시로 5개 풀에서 선택하므로 재방문 시 같은 책은 같은 표지.
import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

type Book = Database["public"]["Tables"]["books"]["Row"];

type Palette = { bg: string; accent: string; paper: string };
const PALETTES: ReadonlyArray<Palette> = [
  { bg: "#2a1d10", accent: "#c97b4e", paper: "#f5ecdc" }, // dark brown
  { bg: "#3d2a18", accent: "#d4a574", paper: "#fbf6ea" }, // mid brown
  { bg: "#1f3a3a", accent: "#9ec1ab", paper: "#f0f5ed" }, // teal
  { bg: "#2d3a1f", accent: "#bdc985", paper: "#f3f0e3" }, // moss
  { bg: "#3a2818", accent: "#a86133", paper: "#f1e6cf" }, // ochre
];

const STYLES = ["type-driven", "split-block", "stripe", "centered-circle"] as const;
type Style = (typeof STYLES)[number];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickFor(id: string): { palette: Palette; style: Style } {
  const h = hashId(id);
  return {
    palette: PALETTES[h % PALETTES.length],
    style: STYLES[Math.floor(h / 7) % STYLES.length],
  };
}

type Props = {
  book: Pick<Book, "id" | "title" | "author" | "category" | "cover_url" | "cover_url_external">;
  width?: number;
  shadow?: boolean;
  className?: string;
};

export function BookCover({ book, width = 170, shadow = true, className }: Props) {
  const cover = book.cover_url || book.cover_url_external;

  // 1) 실이미지 우선
  if (cover) {
    return (
      <div
        style={{ width, aspectRatio: "1 / 1.45" }}
        className={cn(
          "relative rounded-cover overflow-hidden",
          shadow && "shadow-cover",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={book.title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 2) Placeholder — 책 id로 deterministic palette × style 선택
  const { palette, style } = pickFor(book.id);
  const h = Math.round(width * 1.45);
  const titleSize = Math.max(11, Math.round(width * 0.11));
  const authorSize = Math.max(9, Math.round(width * 0.065));

  const baseStyle: React.CSSProperties = {
    width,
    height: h,
    background: palette.bg,
    color: palette.paper,
    fontFamily: "'Noto Serif KR', 'Source Serif Pro', serif",
  };

  const baseClass = cn(
    "relative overflow-hidden rounded-cover flex flex-col",
    shadow && "shadow-cover",
    className,
  );

  if (style === "split-block") {
    return (
      <div style={baseStyle} className={baseClass} aria-label={book.title}>
        <div
          style={{ height: "55%", background: palette.accent, padding: "10% 10% 0" }}
        >
          <div
            style={{
              fontSize: Math.max(8, Math.round(width * 0.055)),
              letterSpacing: "0.2em",
              color: palette.bg,
              opacity: 0.85,
              textTransform: "uppercase",
            }}
          >
            {book.category}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "8% 10%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              color: palette.paper,
            }}
          >
            {book.title}
          </div>
          <div style={{ fontSize: authorSize, opacity: 0.7 }}>{book.author}</div>
        </div>
      </div>
    );
  }

  if (style === "stripe") {
    return (
      <div style={baseStyle} className={baseClass} aria-label={book.title}>
        <div
          style={{
            flex: 1,
            padding: "12% 10% 6%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: Math.max(8, Math.round(width * 0.05)),
              letterSpacing: "0.25em",
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            SK BIO LIBRARY
          </div>
          <div>
            <div
              style={{
                fontSize: titleSize * 1.1,
                fontWeight: 800,
                lineHeight: 1.1,
                color: palette.paper,
                letterSpacing: "-0.01em",
              }}
            >
              {book.title}
            </div>
            <div
              style={{
                height: 3,
                width: "30%",
                background: palette.accent,
                marginTop: "8%",
              }}
            />
          </div>
        </div>
        <div
          style={{
            background: palette.accent,
            padding: "5% 10%",
            color: palette.bg,
            fontSize: authorSize,
            fontWeight: 600,
          }}
        >
          {book.author}
        </div>
      </div>
    );
  }

  if (style === "centered-circle") {
    return (
      <div style={baseStyle} className={baseClass} aria-label={book.title}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "62%",
            height: "44%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${palette.accent}, ${palette.bg} 70%)`,
            boxShadow: `0 0 60px ${palette.accent}55`,
          }}
        />
        <div style={{ position: "relative", padding: "10% 10%" }}>
          <div
            style={{
              fontSize: Math.max(8, Math.round(width * 0.05)),
              letterSpacing: "0.2em",
              opacity: 0.6,
            }}
          >
            {book.category}
          </div>
        </div>
        <div style={{ marginTop: "auto", padding: "0 10% 10%", position: "relative" }}>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.15 }}>
            {book.title}
          </div>
          <div style={{ fontSize: authorSize, opacity: 0.7, marginTop: 4 }}>
            {book.author}
          </div>
        </div>
      </div>
    );
  }

  // default — type-driven (big title takes the page)
  return (
    <div style={baseStyle} className={baseClass} aria-label={book.title}>
      <div
        style={{
          flex: 1,
          padding: "14% 10% 8%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: Math.max(8, Math.round(width * 0.05)),
            letterSpacing: "0.22em",
            opacity: 0.6,
            textTransform: "uppercase",
          }}
        >
          {book.category}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: titleSize * 1.25,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: palette.paper,
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            marginTop: "8%",
            paddingTop: "6%",
            borderTop: `1px solid ${palette.paper}44`,
            fontSize: authorSize,
            opacity: 0.75,
          }}
        >
          {book.author}
        </div>
      </div>
    </div>
  );
}
