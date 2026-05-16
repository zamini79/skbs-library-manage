"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/policies";

type SidebarItem = {
  href: string;
  label: string;
  /** true면 master 전용. 생략 시 book/master 둘 다 허용. */
  masterOnly?: boolean;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const SECTIONS: SidebarSection[] = [
  {
    title: "Main",
    items: [{ href: "/admin/dashboard", label: "대시보드" }],
  },
  {
    title: "도서",
    items: [
      { href: "/admin/books", label: "도서 목록", masterOnly: true },
      { href: "/admin/books/new", label: "신규 입고", masterOnly: true },
      { href: "/admin/books/bulk-upload", label: "엑셀 업로드", masterOnly: true },
    ],
  },
  {
    title: "대여",
    items: [
      { href: "/admin/rentals/new", label: "대여 등록" },
      { href: "/admin/rentals/return", label: "반납 처리" },
      { href: "/admin/rentals/overdue", label: "연체 목록" },
    ],
  },
];

export function Sidebar({ role }: { role: AdminRole }) {
  const currentPath = usePathname() || "";
  return (
    <aside className="w-[220px] bg-sidebar-bg text-sidebar-fg flex flex-col">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="text-sm font-bold tracking-tight text-white">
          SK Bioscience 사내 도서관
        </div>
        <div className="font-mono text-[9px] tracking-widest text-sidebar-section mt-1">
          ADMIN CONSOLE
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.masterOnly || role === "master",
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="px-6 pt-4 pb-2 text-[10px] tracking-widest text-sidebar-section uppercase">
                {section.title}
              </div>
              {visibleItems.map((item) => {
                const active =
                  currentPath === item.href ||
                  currentPath.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block px-6 py-2.5 text-sm border-l-[3px] transition-colors",
                      active
                        ? "bg-sidebar-bg-active text-sidebar-fg-active border-primary"
                        : "border-transparent hover:bg-sidebar-bg-active/50",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
