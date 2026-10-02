import { Chess } from "chess.js";
import type { Engine, Info } from "@/lib/engine";
import type { GameRow } from "@/lib/games";
import { winChance } from "@/lib/analysis";

// Guess the Move: positions from database games where Stockfish sees one clearly best move.
// Most positions have several near-equal moves, which would make guessing the engine's choice luck,
// so candidates are searched with two lines and kept only when the best beats the second by MIN_GAP.

export type GuessGame = GameRow & { moves: string[] }; // SAN

export type GuessPosition = {
  game: GuessGame;
  ply: number; // moves[ply] is the move to guess
  fen: string;
  lastMove: [string, string] | null;
  best: string; // UCI
  bestSan: string;
};

const GO = "depth 16 movetime 1000";
// Winning chances (0–100) the best move must be ahead of the second best by. 8 is about 0.9 pawns in
// an equal position; roughly one candidate in ten qualifies.
const MIN_GAP = 8;
const FIRST_PLY = 16; // skip the opening
const CANDIDATES_PER_GAME = 8;

// Searches random games until one has a qualifying position. Expects the engine to be set to MultiPV 2.
export async function findPosition(engine: Engine): Promise<GuessPosition> {
  for (;;) {
    const res = await fetch("/api/guess");
    if (!res.ok) throw new Error("no game");
    const game: GuessGame = await res.json();
    const plies = Array.from({ length: game.moves.length - FIRST_PLY - 4 }, (_, i) => FIRST_PLY + i)
      .sort(() => Math.random() - 0.5)
      .slice(0, CANDIDATES_PER_GAME);
    for (const ply of plies) {
      const found = await check(engine, game, ply);
      if (found) return found;
    }
  }
}

async function check(engine: Engine, game: GuessGame, ply: number): Promise<GuessPosition | null> {
  const chess = new Chess();
  for (const san of game.moves.slice(0, ply)) chess.move(san);
  const last = chess.history({ verbose: true }).at(-1);
  if (chess.moves().length < 2) return null;

  const lines: Info[] = [];
  const best = await engine.search(chess.fen(), GO, (info) => (lines[info.multipv - 1] = info)).result;
  const [top, second] = lines;
  if (!best || !top || !second || top.pv[0] !== best) return null;
  if (winChance(top.cp, top.mate) - winChance(second.cp, second.mate) < MIN_GAP) return null;

  const move = chess.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
  // Taking back a piece that was just captured is too obvious.
  if (last?.captured && move.to === last.to) return null;
  return {
    game,
    ply,
    fen: move.before,
    lastMove: last ? [last.from, last.to] : null,
    best,
    bestSan: move.san,
  };
}
