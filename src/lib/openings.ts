// Opening book built by scripts/build-openings.mjs: positions keyed by EPD (first four FEN fields).
export type OpeningNode = { name?: string; eco?: string; next: Record<string, string> };
export type OpeningDb = Record<string, OpeningNode>;
export type Line = { epd: string; name: string; eco: string; moves: string[] };

export const START_EPD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

export const epd = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

export const family = (name: string) => name.split(":")[0];

let cache: Promise<OpeningDb> | null = null;
export function loadOpenings() {
  return (cache ??= fetch("/openings.json").then((r) => r.json() as Promise<OpeningDb>));
}

// Every named position with the shortest move sequence reaching it, sorted by ECO then name.
export function buildLines(db: OpeningDb): Line[] {
  const lines: Line[] = [];
  const seen = new Set([START_EPD]);
  let queue: [string, string[]][] = [[START_EPD, []]];
  while (queue.length) {
    const nextQueue: [string, string[]][] = [];
    for (const [key, moves] of queue) {
      const node = db[key];
      if (node.name) lines.push({ epd: key, name: node.name, eco: node.eco!, moves });
      for (const [san, to] of Object.entries(node.next)) {
        if (seen.has(to)) continue;
        seen.add(to);
        nextQueue.push([to, [...moves, san]]);
      }
    }
    queue = nextQueue;
  }
  return lines.sort((a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name));
}

// Name of the closest named position at or after `key`, for continuations that are not named themselves.
export function nearestName(db: OpeningDb, key: string): string | undefined {
  const seen = new Set([key]);
  let queue = [key];
  while (queue.length) {
    const nextQueue: string[] = [];
    for (const k of queue) {
      if (db[k].name) return db[k].name;
      for (const to of Object.values(db[k].next)) {
        if (!seen.has(to)) {
          seen.add(to);
          nextQueue.push(to);
        }
      }
    }
    queue = nextQueue;
  }
}
