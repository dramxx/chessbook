"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { EvalBar } from "@/components/EvalBar";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { analysisHref } from "@/lib/analysis";
import { Engine, type Info } from "@/lib/engine";
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
  const engine = useRef<Engine | null>(null);
  const [analysis, setAnalysis] = useState<{ ply: number; info: Info } | null>(null);

  // positions[i] is the position after i moves; last is the move that led to it.
  const positions = useMemo(() => {
    const chess = new Chess();
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null, mated: false }];
    for (const san of moves) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to }, mated: chess.isCheckmate() });
    }
    return out;
  }, [moves]);
  const { fen, last, mated } = positions[ply];

  useEffect(() => {
    engine.current = new Engine();
    return () => engine.current?.terminate();
  }, []);

  // Eval bar: analysis of the shown position.
  useEffect(() => {
    if (mated || !engine.current) return;
    const search = engine.current.search(fen, "depth 18", (info) => setAnalysis({ ply, info }));
    return () => search.stop();
  }, [fen, ply, mated]);
  const info = analysis?.ply === ply ? analysis.info : null;
  // Engine scores are for the side to move; the bar wants White's view.
  const sign = ply % 2 === 0 ? 1 : -1;

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
        <button
          className="btn-secondary ml-auto"
          onClick={() => setFlipped(!flipped)}
          aria-label="Flip board"
          title="Flip board"
        >
          ⇅
        </button>
      </div>
      <MoveList moves={moves} ply={ply} onSelect={setPly} />
      <Link
        href={analysisHref({ moves, white: game.white, black: game.black, result: game.result })}
        className="btn-secondary mt-auto text-center"
      >
        Analyze
      </Link>
    </>
  );

  return (
    <GameLayout
      boardSide={
        <EvalBar
          cp={info?.cp !== undefined ? info.cp * sign : undefined}
          mate={mated ? (ply % 2 ? 1 : -1) : info?.mate !== undefined ? info.mate * sign : undefined}
          text={mated ? game.result : undefined}
          orientation={flipped ? "black" : "white"}
        />
      }
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
