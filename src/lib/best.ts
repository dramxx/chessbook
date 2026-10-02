export type Best = { name: string; score: number };

// One high score per mode, under its own localStorage key.
export function readBest(key: string): Best | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

export function saveBest(key: string, name: string, score: number): Best {
  const best = { name, score };
  try {
    localStorage.setItem(key, JSON.stringify(best));
  } catch {}
  return best;
}
