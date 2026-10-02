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
const MAX_RESULTS = 100;

export default function OpeningsPage() {
  const [db, setDb] = useState<OpeningDb | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<"next" | "browse">("next");

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

  function playLine(line: Line) {
    setMoves(line.moves);
    setPly(line.moves.length);
    setTab("next");
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
        {(["next", "browse"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-semibold ${tab === t ? "border-b-2 border-accent" : "text-foreground/60"}`}
          >
            {t === "next" ? "Next moves" : "Browse"}
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
          <Browse db={db} onPick={playLine} />
        ))}
    </>
  );

  return (
    <GameLayout
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

// All named openings: grouped by family, or a flat list while filtering.
function Browse({ db, onPick }: { db: OpeningDb; onPick: (line: Line) => void }) {
  const lines = useMemo(() => buildLines(db), [db]);
  const families = useMemo(() => {
    const map = new Map<string, Line[]>();
    for (const line of lines) {
      const f = family(line.name);
      map.set(f, [...(map.get(f) ?? []), line]);
    }
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [lines]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = filter.trim().toLowerCase();
  const matches = q ? lines.filter((l) => l.name.toLowerCase().includes(q) || l.eco.toLowerCase() === q) : [];

  const item = (line: Line) => (
    <li key={line.epd}>
      <button
        onClick={() => onPick(line)}
        className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-surface-hover"
      >
        <span className="shrink-0 font-mono text-xs text-foreground/50">{line.eco}</span>
        {line.name}
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name or ECO…"
        className="rounded bg-surface px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      {q ? (
        <ul>
          {matches.slice(0, MAX_RESULTS).map(item)}
          {matches.length > MAX_RESULTS && (
            <li className="px-2 py-1 text-sm text-foreground/60">
              {matches.length - MAX_RESULTS} more: refine the filter.
            </li>
          )}
          {matches.length === 0 && <li className="px-2 py-1 text-sm text-foreground/60">No matches.</li>}
        </ul>
      ) : (
        <ul>
          {families.map(([name, group]) => (
            <li key={name}>
              <button
                onClick={() => setOpen(open === name ? null : name)}
                className="flex w-full justify-between rounded px-2 py-1 text-left text-sm font-semibold hover:bg-surface-hover"
              >
                {name}
                <span className="font-normal text-foreground/50">{group.length}</span>
              </button>
              {open === name && <ul className="ml-3">{group.map(item)}</ul>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
