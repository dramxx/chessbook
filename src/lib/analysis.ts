import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";
import type { Engine, Info } from "@/lib/engine";
import { epd, type OpeningDb } from "@/lib/openings";

// Game review: Stockfish evaluates every position, then each move is rated by how much it lowered
// the mover's winning chances. Winning chances and accuracy use Lichess' published formulas; labels
// use chess.com's thresholds. chess.com's exact rules aren't public, so Brilliant, Great and Miss
// are heuristics.

export type PositionEval = {
  win: number; // White's winning chances, 0–100
  cp?: number; // White's view
  mate?: number; // White's view; 0 = checkmate on the board
  best?: string; // best move, UCI
  second?: number; // winning chances of the side to move after the second-best move
};

export const LABELS = {
  brilliant: { name: "Brilliant", symbol: "!!", color: "#26c2a3" },
  great: { name: "Great", symbol: "!", color: "#749bbf" },
  best: { name: "Best", symbol: "★", color: "#81b64c" },
  excellent: { name: "Excellent", symbol: "✓", color: "#96bc4b" },
  good: { name: "Good", symbol: "✓", color: "#95b776" },
  book: { name: "Book", symbol: "≡", color: "#a88865" },
  inaccuracy: { name: "Inaccuracy", symbol: "?!", color: "#f7c631" },
  mistake: { name: "Mistake", symbol: "?", color: "#ffa459" },
  miss: { name: "Miss", symbol: "✗", color: "#ff7769" },
  blunder: { name: "Blunder", symbol: "??", color: "#fa412d" },
} as const;
export type Label = keyof typeof LABELS;

export type MoveReview = { label: Label; accuracy: number; bestSan: string | null };

// Same depth for every position keeps the review consistent; the time cap bounds long thinks.
const GO = "depth 18 movetime 1500";

// Winning chances (0–100) of the side whose score this is.
export function winChance(cp?: number, mate?: number) {
  if (mate !== undefined) return mate > 0 ? 100 : 0;
  const c = Math.max(-1000, Math.min(1000, cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

async function evaluate(engine: Engine, fen: string, onSearch: (s: { stop: () => void }) => void): Promise<PositionEval> {
  const pos = new Chess(fen);
  const white = pos.turn() === "w";
  if (pos.isCheckmate()) return { win: white ? 0 : 100, mate: 0 };
  if (pos.isDraw()) return { win: 50, cp: 0 };
  const lines: Info[] = [];
  const search = engine.search(fen, GO, (info) => (lines[info.multipv - 1] = info));
  onSearch(search);
  const best = await search.result;
  const [top, second] = lines;
  const moverWin = top ? winChance(top.cp, top.mate) : 50;
  const sign = white ? 1 : -1;
  return {
    win: white ? moverWin : 100 - moverWin,
    cp: top?.cp !== undefined ? top.cp * sign : undefined,
    mate: top?.mate !== undefined ? top.mate * sign : undefined,
    best: best ?? top?.pv[0],
    second: second ? winChance(second.cp, second.mate) : undefined,
  };
}

// Evaluates the position after each ply (0 = start) in order, reporting each as it finishes.
// Returns a function that stops the analysis.
export function analyze(engine: Engine, moves: string[], onEval: (ply: number, e: PositionEval) => void) {
  let stopped = false;
  let current: { stop: () => void } | null = null;
  (async () => {
    await engine.setOptions({ MultiPV: 2 });
    const chess = new Chess();
    const fens = [chess.fen(), ...moves.map((san) => (chess.move(san), chess.fen()))];
    for (let ply = 0; ply < fens.length && !stopped; ply++) {
      const e = await evaluate(engine, fens[ply], (s) => (current = s));
      if (!stopped) onEval(ply, e);
    }
  })();
  return () => {
    stopped = true;
    current?.stop();
  };
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// The moved piece (a minor or more) can be taken for less than it's worth: hanging, or attacked by
// a cheaper piece. Only looks at the destination square.
function isSacrifice(pos: Chess, move: Move) {
  const value = VALUE[move.promotion ?? move.piece];
  if (value < 3 || (move.captured && VALUE[move.captured] >= value)) return false;
  const to = move.to as Square;
  const defended = pos.attackers(to, move.color).length > 0;
  const attackers = pos
    .attackers(to, pos.turn())
    .map((sq) => pos.get(sq)!.type)
    .filter((t) => t !== "k" || !defended);
  return attackers.length > 0 && (!defended || Math.min(...attackers.map((t) => VALUE[t])) < value);
}

// Lichess' per-move accuracy from the mover's drop in winning chances.
const moveAccuracy = (loss: number) =>
  Math.max(0, Math.min(100, 103.1668100711649 * Math.exp(-0.04354415386753951 * loss) - 3.166924740191411 + 1));

// One review per move, or null while either position around it is still unevaluated.
export function review(moves: string[], evals: (PositionEval | undefined)[], book: OpeningDb | null): (MoveReview | null)[] {
  const chess = new Chess();
  const out: (MoveReview | null)[] = [];
  let inBook = book !== null;
  let prev: Move | null = null;
  for (let i = 0; i < moves.length; i++) {
    const before = evals[i];
    const after = evals[i + 1];
    const white = chess.turn() === "w";
    const legal = chess.moves({ verbose: true });
    const move = chess.move(moves[i]);
    inBook &&= book![epd(chess.fen())] !== undefined;
    if (!before || !after) {
      out.push(null);
      prev = move;
      continue;
    }
    const winBefore = white ? before.win : 100 - before.win;
    const winAfter = white ? after.win : 100 - after.win;
    const isBest = move.lan === before.best || legal.length === 1;
    // The engine's own choice loses nothing, even when the next search sees deeper and disagrees.
    const loss = isBest ? 0 : Math.max(0, winBefore - winAfter);
    const mates = (white ? after.mate : after.mate !== undefined ? -after.mate : undefined) ?? -1;
    const recapture = prev?.captured !== undefined && prev.to === move.to;
    const prevLabel = out[i - 1]?.label;

    let label: Label;
    if (inBook) label = "book";
    // A sacrifice that's the best move, unless the position was already won without it (mating is fine).
    else if (isBest && winAfter >= 45 && (winBefore <= 95 || mates >= 0) && isSacrifice(chess, move)) label = "brilliant";
    // The only move that keeps the position: the second best is clearly worse. Mate in one doesn't count.
    else if (
      isBest && legal.length > 1 && !recapture && !chess.isCheckmate() &&
      before.second !== undefined && winBefore - before.second >= 20
    ) label = "great";
    else if (isBest) label = "best";
    else if (loss < 2) label = "excellent";
    else if (loss < 5) label = "good";
    else if ((prevLabel === "mistake" || prevLabel === "blunder") && loss < 20) label = "miss";
    else if (loss < 10) label = "inaccuracy";
    else if (loss < 20) label = "mistake";
    else label = "blunder";

    const bestSan = isBest ? null : (legal.find((m) => m.lan === before.best)?.san ?? null);
    out.push({ label, accuracy: moveAccuracy(loss), bestSan });
    prev = move;
  }
  return out;
}

// Rough accuracy → rating curve. A single game says little, so this is only a ballpark.
const RATING: [number, number][] = [
  [0, 100], [40, 250], [50, 500], [60, 800], [70, 1150], [75, 1400],
  [80, 1700], [85, 2000], [90, 2350], [95, 2700], [100, 3100],
];
function ratingFor(accuracy: number) {
  const i = RATING.findIndex(([a]) => a >= accuracy);
  if (i <= 0) return RATING[0][1];
  const [a0, r0] = RATING[i - 1];
  const [a1, r1] = RATING[i];
  return Math.round((r0 + ((accuracy - a0) / (a1 - a0)) * (r1 - r0)) / 50) * 50;
}

const MIN_RATED_MOVES = 8;

// Accuracy (mean of the arithmetic and harmonic means, as Lichess blends them), label counts and
// an estimated rating for one side. Book moves don't count towards accuracy.
export function summarize(reviews: (MoveReview | null)[], color: "white" | "black") {
  const mine = reviews.filter((r, i): r is MoveReview => r !== null && i % 2 === (color === "white" ? 0 : 1));
  const counts = Object.fromEntries(Object.keys(LABELS).map((l) => [l, 0])) as Record<Label, number>;
  for (const r of mine) counts[r.label]++;
  const rated = mine.filter((r) => r.label !== "book").map((r) => r.accuracy);
  if (!rated.length) return { counts, accuracy: null, rating: null };
  const mean = rated.reduce((s, a) => s + a, 0) / rated.length;
  const harmonic = rated.length / rated.reduce((s, a) => s + 1 / Math.max(a, 1), 0);
  const accuracy = (mean + harmonic) / 2;
  return { counts, accuracy, rating: rated.length >= MIN_RATED_MOVES ? ratingFor(accuracy) : null };
}

// Finished reviews are kept per move list, so reopening a game is instant.
const CACHE_KEY = "chessbook.analysis";
const CACHE_SIZE = 20;
const cacheKey = (moves: string[]) => `${GO}|${moves.join(" ")}`;

function readCache(): [string, PositionEval[]][] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function cachedEvals(moves: string[]) {
  return readCache().find(([k]) => k === cacheKey(moves))?.[1] ?? null;
}

export function cacheEvals(moves: string[], evals: PositionEval[]) {
  const key = cacheKey(moves);
  const entries = [[key, evals], ...readCache().filter(([k]) => k !== key)].slice(0, CACHE_SIZE);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

export type AnalysisTarget = { moves: string[]; white: string; black: string; result: string; you?: "white" | "black" };

export function analysisHref({ moves, white, black, result, you }: AnalysisTarget) {
  const q = new URLSearchParams({ white, black, result, moves: moves.join(" ") });
  if (you) q.set("you", you);
  return `/analysis?${q}`;
}
