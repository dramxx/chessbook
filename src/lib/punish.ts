import { Chess } from "chess.js";
import { epd } from "@/lib/openings";

// "Punish it" puzzles: a common club-player mistake, and the replies that punish it.
// public/punish.json (scripts/build-punish.mjs) covers the most played openings at 1400-1999;
// public/punish-repertoire.json (scripts/build-punish-repertoire.mjs) covers the opponent's mistakes
// inside the opening courses, tagged with the courses they belong to.
export type PunishPuzzle = {
  id: string;
  fen: string; // after the mistake: the punisher to move
  moves: string[]; // SAN from the start position, the mistake last
  opening: string | null;
  games: number; // how often club players make the mistake
  score?: number; // the mistaken side's score after it, in percent
  drop: number; // centipawns the mistake loses
  replies: { san: string; uci: string; cp: number }[]; // best first, cp for the punisher
  pv: string[]; // best line, UCI
  courses: string[]; // courses whose lines reach the position before the mistake
};

type Raw = {
  id: number | string;
  fen: string;
  moves: string;
  opening: string | null;
  games: number;
  score?: number;
  drop: number;
  replies: [string, string, number][];
  pv: string;
  courses?: string[];
};

const parse = (r: Raw): PunishPuzzle => ({
  id: String(r.id),
  fen: r.fen,
  moves: r.moves.split(" "),
  opening: r.opening,
  games: r.games,
  score: r.score,
  drop: r.drop,
  replies: r.replies.map(([san, uci, cp]) => ({ san, uci, cp })),
  pv: r.pv ? r.pv.split(" ") : [],
  courses: r.courses ?? [],
});

let cache: Promise<PunishPuzzle[]> | null = null;

// Both files, one entry per position: a repertoire entry adds its courses to a general one.
export function loadPunish(): Promise<PunishPuzzle[]> {
  cache ??= Promise.all(
    ["/punish.json", "/punish-repertoire.json"].map((url) =>
      fetch(url)
        .then((r) => (r.ok ? (r.json() as Promise<Raw[]>) : []))
        .catch(() => []),
    ),
  ).then(([general, repertoire]) => {
    const byPosition = new Map<string, PunishPuzzle>();
    for (const raw of [...general, ...repertoire]) {
      const puzzle = parse(raw);
      const key = epd(puzzle.fen);
      const known = byPosition.get(key);
      if (known) known.courses = [...new Set([...known.courses, ...puzzle.courses])];
      else byPosition.set(key, puzzle);
    }
    return [...byPosition.values()];
  });
  return cache;
}

// The position before the mistake.
export function beforeMistake(p: PunishPuzzle) {
  const chess = new Chess();
  for (const san of p.moves.slice(0, -1)) chess.move(san);
  return chess.fen();
}

export type Verdict = "best" | "good" | "playable" | "miss";

// A move keeps the punishment if it stays close to the best reply and still leaves a clear edge.
export function grade(best: number, cp: number, isBest: boolean): Verdict {
  if (isBest) return "best";
  if (cp >= best - Math.max(60, Math.abs(best) * 0.3) && cp >= 80) return "good";
  if (cp >= 30) return "playable";
  return "miss";
}

// --- Progress (this browser only) ------------------------------------------------------------

const KEY = "punish:v1";
export type PunishStats = { solved: string[]; missed: string[] };

export function loadStats(): PunishStats {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { solved: [], missed: [] };
  } catch {
    return { solved: [], missed: [] };
  }
}

export function recordResult(id: string, solved: boolean) {
  const s = loadStats();
  s.solved = s.solved.filter((x) => x !== id);
  s.missed = s.missed.filter((x) => x !== id);
  (solved ? s.solved : s.missed).push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
