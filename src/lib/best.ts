export type Best = { name: string; score: number };

const KEY = "puzzlerush.best";

export function readBest(): Best | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveBest(name: string, score: number): Best {
  const best = { name, score };
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch {}
  return best;
}
