"use client";

import Link from "next/link";
import { defaultPieces } from "react-chessboard";
import { COURSES, variationsOf } from "@/lib/learn";

// Client component: the king icons come from react-chessboard.
export default function LearnPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4">
      {COURSES.map((c) => (
        <Link key={c.id} href={`/learn/${c.id}`} className="flex flex-col gap-2 rounded-lg bg-panel p-6 hover:bg-surface">
          <span className="size-12">{defaultPieces[c.side === "white" ? "wK" : "bK"]()}</span>
          <span className="text-xl font-bold">{c.title}</span>
          <span className="text-sm text-foreground/60">{c.intro}</span>
          <span className="text-xs text-foreground/50">
            {c.chapters.length} chapters · {variationsOf(c).length} variations · as {c.side}
          </span>
        </Link>
      ))}
    </main>
  );
}
