"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { ContinuationList } from "@/components/ContinuationList";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { buildLines, epd, family, loadOpenings, type Line, type OpeningDb } from "@/lib/openings";
import { fetchExplorer, type Explorer, type TopGame } from "@/lib/explorer";
import { playMoveSound } from "@/lib/sounds";

const LAST_MOVE = "rgba(255,255,51,.4)";
const MAX_VARIATIONS = 10;

export default function OpeningsPage() {
  const [db, setDb] = useState<OpeningDb | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<"next" | "openings">("next");
  const [picked, setPicked] = useState<Line | null>(null);

  const [stats, setStats] = useState<{ fen: string; data: Explorer } | null>(null);

  useEffect(() => {
    loadOpenings().then(setDb);
  }, []);

  // positions[i] is the position after i moves; last is the move that led to it.
  const positions = useMemo(() => {
    const chess = new Chess();
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null }];
    for (const san of moves) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, [moves]);

  const { fen, last } = positions[ply];
  const white = fen.split(" ")[1] === "w";

  useEffect(() => {
    let current = true;
    fetchExplorer(fen).then((data) => current && data && setStats({ fen, data }));
    return () => {
      current = false;
    };
  }, [fen]);
  const explorer = stats?.fen === fen ? stats.data : null;

  // Name of the current position, else of the closest named position earlier in the line.
  let opening: { name: string; eco: string; exact: boolean } | null = null;
  if (db) {
    for (let i = ply; i >= 0 && !opening; i--) {
      const node = db[epd(positions[i].fen)];
      if (node?.name) opening = { name: node.name, eco: node.eco!, exact: i === ply };
    }
  }

  function play(san: string) {
    const move = new Chess(fen).move(san);
    playMoveSound(move);
    if (moves[ply] !== san) setMoves([...moves.slice(0, ply), san]);
    setPly(ply + 1);
  }

  function onMove(from: string, to: string, promotion?: string) {
    try {
      play(new Chess(fen).move({ from, to, promotion }).san);
    } catch {}
  }

  // Loads a variation at its first move, to be stepped through with the move buttons.
  function pickLine(line: Line) {
    setMoves(line.moves);
    setPly(0);
    setPicked(line);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPly((p) => Math.min(moves.length, p + 1));
      else if (e.key === "Home") setPly(0);
      else if (e.key === "End") setPly(moves.length);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  const highlights: Record<string, string> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {};

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">
          {!db ? "Loading…" : opening ? opening.name : "Starting position"}
        </h1>
        <p className="text-sm text-foreground/60">
          {opening && `${opening.eco}${opening.exact ? "" : " · out of book"} · `}
          {white ? "White" : "Black"} to move
        </p>
        {opening && (
          <Link
            href={`/games?opening=${encodeURIComponent(opening.name)}`}
            className="text-sm text-accent hover:underline"
          >
            Games in this opening →
          </Link>
        )}
        {ply > 0 && (
          <Link
            href={`/stockfish?moves=${encodeURIComponent(moves.slice(0, ply).join(" "))}`}
            className="ml-3 text-sm text-accent hover:underline"
          >
            Play vs Stockfish from here →
          </Link>
        )}
      </div>
      <div className="flex gap-1">
        <button className="btn-secondary" disabled={ply === 0} onClick={() => setPly(0)} aria-label="Start">
          ⏮
        </button>
        <button className="btn-secondary" disabled={ply === 0} onClick={() => setPly(ply - 1)} aria-label="Back">
          ◀
        </button>
        <button
          className="btn-secondary"
          disabled={ply === moves.length}
          onClick={() => setPly(ply + 1)}
          aria-label="Forward"
        >
          ▶
        </button>
        <button
          className="btn-secondary"
          disabled={ply === moves.length}
          onClick={() => setPly(moves.length)}
          aria-label="End"
        >
          ⏭
        </button>
        <button className="btn-secondary ml-auto" onClick={() => setFlipped(!flipped)}>
          Flip
        </button>
      </div>
      <MoveList moves={moves} ply={ply} onSelect={setPly} />
      <div className="flex gap-1 border-b border-surface">
        {(["next", "openings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-semibold ${tab === t ? "border-b-2 border-accent" : "text-foreground/60"}`}
          >
            {t === "next" ? "Next moves" : "Openings"}
          </button>
        ))}
      </div>
      {db &&
        (tab === "next" ? (
          <>
            <ContinuationList
              db={db}
              fen={fen}
              stats={explorer}
              moveNumber={Math.floor(ply / 2) + 1}
              onPlay={play}
            />
            {explorer && explorer.topGames.length > 0 && <TopGames games={explorer.topGames} />}
          </>
        ) : (
          <Openings db={db} picked={picked} onPick={pickLine} />
        ))}
    </>
  );

  return (
    <GameLayout
      scrollPanel
      board={
        <Board
          fen={fen}
          orientation={flipped ? "black" : "white"}
          canMove
          moveBothSides
          onMove={onMove}
          highlights={highlights}
        />
      }
      panel={panel}
    />
  );
}

// Master games that reached this position; each opens in the game replay.
function TopGames({ games }: { games: TopGame[] }) {
  const score = (g: TopGame) => (g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "½-½");
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">Top games</h2>
      <ul className="flex flex-col">
        {games.map((g) => (
          <li key={g.id}>
            <Link
              href={`/games/masters/${g.id}`}
              className="flex items-baseline gap-2 rounded px-2 py-1 text-sm hover:bg-surface-hover"
            >
              <span className="min-w-0 flex-1 truncate">
                {g.white.name} – {g.black.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-foreground/60">
                {score(g)} · {g.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Variation = { name: string; line: Line; count: number };

// Openings grouped by family, each with its variations: the first part of the name after the
// family ("Najdorf Variation" in "Sicilian Defense: Najdorf Variation, English Attack"), ranked by
// how many named lines they contain. A variation plays its shortest line carrying exactly its name.
function groupVariations(lines: Line[]): [string, Variation[]][] {
  const families = new Map<string, Map<string, Variation>>();
  for (const line of lines) {
    const f = family(line.name);
    const name = line.name.slice(f.length + 2).split(",")[0];
    const variations = families.get(f) ?? families.set(f, new Map()).get(f)!;
    const v = variations.get(name);
    if (!v) variations.set(name, { name, line, count: 1 });
    else {
      v.count++;
      // Prefer a line named exactly after the variation, then the shortest.
      const exact = (l: Line) => +(l.name === (name ? `${f}: ${name}` : f));
      if ((exact(line) - exact(v.line) || v.line.moves.length - line.moves.length) > 0) v.line = line;
    }
  }
  // Main line first, then by number of named lines.
  const rank = (a: Variation, b: Variation) => +!b.name - +!a.name || b.count - a.count || a.name.localeCompare(b.name);
  return [...families]
    .map(([f, m]): [string, Variation[]] => [f, [...m.values()].sort(rank)])
    .sort(([a], [b]) => a.localeCompare(b));
}

// Names of openings with games in the database; null when unavailable (then every games link shows).
let withGames: Promise<string[] | null> | null = null;
const loadWithGames = () =>
  (withGames ??= fetch("/api/openings")
    .then((r) => (r.ok ? (r.json() as Promise<string[]>) : null))
    .catch(() => null));

// All opening families, each with a picker of its main variations; picking one loads it on the board.
function Openings({ db, picked, onPick }: { db: OpeningDb; picked: Line | null; onPick: (line: Line) => void }) {
  const families = useMemo(() => groupVariations(buildLines(db)), [db]);
  const [filter, setFilter] = useState("");
  const [gameNames, setGameNames] = useState<string[] | null>(null);

  useEffect(() => {
    loadWithGames().then(setGameNames);
  }, []);

  const q = filter.trim().toLowerCase();
  const rows = families.flatMap(([name, variations]) => {
    if (!q || name.toLowerCase().includes(q)) return [{ name, variations: variations.slice(0, MAX_VARIATIONS) }];
    const matches = variations.filter((v) => v.name.toLowerCase().includes(q) || v.line.eco.toLowerCase() === q);
    return matches.length ? [{ name, variations: matches }] : [];
  });

  return (
    <div className="flex flex-col gap-2">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name or ECO…"
        className="rounded bg-surface px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <ul className="flex flex-col gap-1">
        {rows.map(({ name, variations }) => {
          const current = picked && family(picked.name) === name ? picked : null;
          return (
            <li
              key={name}
              className={`flex flex-col gap-1 rounded px-2 py-1 text-sm ${current ? "bg-surface" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 font-semibold">{name}</span>
                <select
                  value={current?.epd ?? ""}
                  onChange={(e) => onPick(variations.find((v) => v.line.epd === e.target.value)!.line)}
                  className="w-36 shrink-0 rounded bg-surface px-1 py-1 text-sm"
                >
                  <option value="" disabled>
                    Variation…
                  </option>
                  {current && !variations.some((v) => v.line.epd === current.epd) && (
                    <option value={current.epd}>{current.name}</option>
                  )}
                  {variations.map((v) => (
                    <option key={v.line.epd} value={v.line.epd}>
                      {v.name || "Main line"}
                    </option>
                  ))}
                </select>
              </div>
              {current && (!gameNames || gameNames.some((n) => n.includes(current.name))) && (
                <Link
                  href={`/games?opening=${encodeURIComponent(current.name)}`}
                  className="text-accent hover:underline"
                >
                  Games in this variation →
                </Link>
              )}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-2 py-1 text-sm text-foreground/60">No matches.</li>}
      </ul>
    </div>
  );
}
