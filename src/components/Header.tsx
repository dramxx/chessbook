"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/openings", label: "Openings" },
  { href: "/games", label: "Games" },
  { href: "/analysis", label: "Analysis" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/bot", label: "Stockfish" },
  { href: "/play", label: "Play" },
];
// Sections that don't exist yet are shown disabled.
const AVAILABLE = new Set(["/openings", "/games", "/puzzles", "/bot", "/play", "/analysis"]);

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-(--header-h) shrink-0 items-center gap-4 bg-panel px-4">
      <Link href="/" className="shrink-0 text-lg font-bold whitespace-nowrap">
        ♞ Chessbook
      </Link>
      <nav className="flex items-center gap-1 overflow-x-auto">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const cls = "rounded px-3 py-1.5 text-sm font-semibold whitespace-nowrap";
          if (!AVAILABLE.has(href)) {
            return (
              <span key={href} aria-disabled className={`${cls} cursor-not-allowed opacity-40`}>
                {label}
              </span>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${cls} ${active ? "bg-surface" : "hover:bg-surface-hover"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
