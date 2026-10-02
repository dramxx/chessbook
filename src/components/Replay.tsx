"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { epd, loadOpenings } from "@/lib/openings";

const LAST_MOVE = "rgba(255,255,51,.4)";
const OPENING_PLIES = 40; // same depth as scripts/import-games.mjs

export type ReplayGame = {
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  event: string | null;
  site: string | null;
  date: string | null;
  round: string | null;
  result: string;
  eco: string | null;
  moves: string[];
};

const player = (name: string, elo: number | null) => (elo ? `${name} (${elo})` : name);

// Read-only replay of a finished game: board, header, move list and ⏮ ◀ ▶ ⏭ / arrow-key navigation.
// The current move is kept in the URL (?ply=N), so a link opens the game at that move.
export function Replay({ game, initialPly = 0 }: { game: ReplayGame; initialPly?: number }) {
  const { moves } = game;
  const [ply, setPly] = useState(Math.max(0, Math.min(initialPly, moves.length)));
  const [opening, setOpening] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

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

  useEffect(() => {
    window.history.replaceState(null, "", ply ? `?ply=${ply}` : window.location.pathname);
  }, [ply]);

  // Deepest named opening among the first OPENING_PLIES positions.
  useEffect(() => {
    loadOpenings().then((db) => {
      let name: string | null = null;
      for (const p of positions.slice(1, OPENING_PLIES + 1)) name = db[epd(p.fen)]?.name ?? name;
      setOpening(name);
    });
  }, [positions]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
  const pgn = [
    ...Object.entries({
      Event: game.event, Site: game.site, Date: game.date, Round: game.round,
      White: game.white, Black: game.black, Result: game.result, ECO: game.eco,
    }).map(([k, v]) => `[${k} "${v ?? "?"}"]`),
    "",
    moves.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(" ") + ` ${game.result}`,
  ].join("\n");

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">
          {player(game.white, game.whiteElo)} – {player(game.black, game.blackElo)}
        </h1>
        <p className="text-sm text-foreground/60">
          {[game.result, game.eco, game.event, game.site, game.date?.replace(/\.\?\?/g, "")]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {opening && (
          <Link href={`/games?opening=${encodeURIComponent(opening)}`} className="text-sm hover:underline">
            {opening}
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
      <button className="btn-secondary self-start text-sm" onClick={() => navigator.clipboard.writeText(pgn)}>
        Copy PGN
      </button>
    </>
  );

  return (
    <GameLayout
      board={
        <Board
          fen={fen}
          orientation={flipped ? "black" : "white"}
          canMove={false}
          onMove={() => {}}
          highlights={highlights}
        />
      }
      panel={panel}
    />
  );
}
