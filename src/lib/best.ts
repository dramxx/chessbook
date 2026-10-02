// Shared high-score tables, one per mode (stored on the server by /api/scores).
export type Mode = "rush" | "guess";
export type Score = { name: string; score: number };

export const MODES: Mode[] = ["rush", "guess"];
export const TOP = 10;
export const MAX_NAME = 20;
export const MAX_SCORE = 1000; // anything above is not a real run

export async function fetchTop(mode: Mode): Promise<Score[]> {
  const r = await fetch(`/api/scores?mode=${mode}`);
  if (!r.ok) throw new Error(`scores: ${r.status}`);
  return r.json();
}

// Saves a score and returns the updated top list.
export async function submitScore(mode: Mode, name: string, score: number): Promise<Score[]> {
  const r = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, name, score }),
  });
  if (!r.ok) throw new Error(`scores: ${r.status}`);
  return r.json();
}

export const qualifies = (top: Score[], score: number) =>
  score > 0 && (top.length < TOP || score > top[TOP - 1].score);
