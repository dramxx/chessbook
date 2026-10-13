"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COURSES } from "@/lib/learn";
import { loadPunish, loadStats, type PunishPuzzle, type PunishStats } from "@/lib/punish";
import { loadTrapResults, TRAPS, trapTags } from "@/lib/traps";

const CLUB_TRAPS = 40;
const MIN_LOSS = 400; // centipawns: a club trap costs the victim at least four pawns

export default function TrapsPage() {
  const [club, setClub] = useState<PunishPuzzle[] | null>(null);
  const [punishStats, setPunishStats] = useState<PunishStats | null>(null);
  const [solved, setSolved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPunish().then((all) =>
      setClub(all.filter((p) => p.drop >= MIN_LOSS).sort((a, b) => b.games - a.games).slice(0, CLUB_TRAPS)),
    );
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage after hydration */
    setPunishStats(loadStats());
    setSolved(loadTrapResults());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const tags = useMemo(() => new Map(TRAPS.map((t) => [t.id, trapTags(t, COURSES)])), []);

  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4">
      <div className="rounded-lg bg-panel p-6">
        <h1 className="text-2xl font-bold">Opening traps</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Famous traps to set and to avoid. The opening plays itself up to the critical moment; then you play the
          trapper&apos;s moves. Traps marked with a course come up in your repertoire.
        </p>
      </div>

      <section className="rounded-lg bg-panel p-6">
        <h2 className="text-xl font-bold">Famous traps</h2>
        <ul className="mt-3 grid gap-1">
          {TRAPS.map((t) => (
            <li key={t.id}>
              <Link href={`/puzzles/traps/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-2 hover:bg-surface">
                <span className="flex-1">
                  <span className="font-semibold">{t.name}</span>
                  <span className="ml-2 text-sm text-foreground/50">
                    {t.opening} · {t.side === "white" ? "White" : "Black"} sets it
                  </span>
                </span>
                {tags.get(t.id)?.map(({ course, kind }) => (
                  <span
                    key={course.id}
                    className={`rounded px-1.5 py-0.5 text-xs ${kind === "set" ? "bg-accent/20 text-accent" : "bg-red-400/15 text-red-300"}`}
                    title={kind === "set" ? "You can set this trap in this course" : "This trap can be set against you in this course"}
                  >
                    {kind === "set" ? "Set it" : "Avoid it"}: {course.title}
                  </span>
                ))}
                <span className="w-4 text-accent">{solved[t.id] && "✓"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg bg-panel p-6">
        <h2 className="text-xl font-bold">Traps club players fall into</h2>
        <p className="mt-1 text-sm text-foreground/60">
          The most common moves at 1400-1999 that lose four pawns or more. Each one opens as a Punish it puzzle.
        </p>
        {!club ? (
          <p className="mt-3 text-sm text-foreground/60">Loading…</p>
        ) : (
          <ol className="mt-3 grid gap-1">
            {club.map((p) => (
              <li key={p.id}>
                <Link href={`/puzzles/punish?id=${p.id}`} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-surface">
                  <span className="flex-1 font-mono text-sm">{p.moves.join(" ")}</span>
                  <span className="text-xs text-foreground/50">
                    {p.games.toLocaleString()} games · {p.drop >= 5000 ? "allows mate" : `−${(p.drop / 100).toFixed(1)}`}
                  </span>
                  <span className="w-4 text-accent">{punishStats?.solved.includes(p.id) && "✓"}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
