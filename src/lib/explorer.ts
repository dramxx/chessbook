import { epd } from "@/lib/openings";

// Master-game statistics for a position, from /api/explorer. Null when unavailable
// (no token, rate limited, offline): callers show the book without stats.
export type Counts = { white: number; draws: number; black: number };
export type TopGame = {
  id: string;
  winner: "white" | "black" | null;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  year: number;
};
export type Explorer = Counts & { moves: (Counts & { san: string })[]; topGames: TopGame[] };

const cache = new Map<string, Promise<Explorer | null>>();

export function fetchExplorer(fen: string): Promise<Explorer | null> {
  // Move counters don't matter to the explorer; dropping them lets equal positions share a cache entry.
  const key = `${epd(fen)} 0 1`;
  let result = cache.get(key);
  if (!result) {
    result = fetch(`/api/explorer?fen=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Explorer>) : null))
      .catch(() => null)
      .then((data) => {
        if (!data) cache.delete(key); // retry failures next time
        return data;
      });
    cache.set(key, result);
  }
  return result;
}

export const total = (c: Counts) => c.white + c.draws + c.black;
