export type Puzzle = {
  id: string;
  fen: string; // position before the opponent's setup move
  moves: string[]; // UCI; moves[0] is the opponent's, then alternating player/opponent
  rating: number;
};

let cache: Promise<Puzzle[]> | null = null;

export function loadPuzzles(): Promise<Puzzle[]> {
  cache ??= fetch("/puzzles.json")
    .then((r) => r.json() as Promise<[string, string, string, number][]>)
    .then((rows) =>
      rows.map(([id, fen, moves, rating]) => ({ id, fen, moves: moves.split(" "), rating })),
    );
  return cache;
}

export const START_RATING = 400;
export const RATING_STEP = 45;

export function targetRating(index: number) {
  return START_RATING + index * RATING_STEP;
}

// Random unused puzzle near the target rating; falls back to the closest unused one.
export function pickPuzzle(all: Puzzle[], target: number, used: Set<string>): Puzzle {
  const unused = all.filter((p) => !used.has(p.id));
  const near = unused.filter((p) => Math.abs(p.rating - target) <= 50);
  if (near.length) return near[Math.floor(Math.random() * near.length)];
  return unused.reduce((best, p) =>
    Math.abs(p.rating - target) < Math.abs(best.rating - target) ? p : best,
  );
}
