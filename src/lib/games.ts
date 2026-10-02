import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { decodeMoves } from "@/lib/movecodec.mjs";

// Server-only access to db/games.db (built by scripts/import-games.mjs, read-only here).

export type GameRow = {
  id: number;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  event: string | null;
  site: string | null;
  date: string | null;
  year: number | null;
  round: string | null;
  result: string;
  eco: string | null;
  plies: number;
};

export type Search = {
  players?: string[]; // one name: their games; two: only games between them, either color
  event?: string;
  opening?: string;
  eco?: string;
  from?: number;
  to?: number;
  result?: string;
  page?: number;
};

export const PAGE_SIZE = 50;

let db: DatabaseSync | null = null;
function open() {
  db ??= new DatabaseSync(path.join(process.cwd(), "db/games.db"), { readOnly: true });
  return db;
}

const SELECT = `SELECT g.id, w.name AS white, b.name AS black, g.white_elo AS whiteElo, g.black_elo AS blackElo,
  e.name AS event, e.site, g.date, g.year, g.round, g.result, g.eco, g.plies
FROM games g JOIN players w ON w.id = g.white JOIN players b ON b.id = g.black LEFT JOIN events e ON e.id = g.event`;

// Newest first. Returns one page and whether another follows.
export function searchGames(s: Search): { games: GameRow[]; more: boolean } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  const named = "(SELECT id FROM players WHERE name LIKE ?)";
  const [a, b] = s.players ?? [];
  if (b) {
    where.push(`((g.white IN ${named} AND g.black IN ${named}) OR (g.white IN ${named} AND g.black IN ${named}))`);
    params.push(`%${a}%`, `%${b}%`, `%${b}%`, `%${a}%`);
  } else if (a) {
    where.push(`(g.white IN ${named} OR g.black IN ${named})`);
    params.push(`%${a}%`, `%${a}%`);
  }
  if (s.event) {
    where.push(`g.event IN (SELECT id FROM events WHERE name LIKE ?)`);
    params.push(`%${s.event}%`);
  }
  if (s.opening) {
    where.push(`g.opening IN (SELECT id FROM openings WHERE name LIKE ?)`);
    params.push(`%${s.opening}%`);
  }
  if (s.eco) {
    where.push(`g.eco GLOB ?`);
    params.push(`${s.eco.toUpperCase()}*`);
  }
  if (s.from) {
    where.push(`g.year >= ?`);
    params.push(s.from);
  }
  if (s.to) {
    where.push(`g.year <= ?`);
    params.push(s.to);
  }
  if (s.result) {
    where.push(`g.result = ?`);
    params.push(s.result);
  }
  const sql = `${SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY g.year DESC, g.id DESC LIMIT ${PAGE_SIZE + 1} OFFSET ${(s.page ?? 0) * PAGE_SIZE}`;
  const rows = open().prepare(sql).all(...params) as GameRow[];
  return { games: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE };
}

export function getGame(id: number): (GameRow & { moves: string[] }) | null {
  const d = open();
  const row = d.prepare(`${SELECT} WHERE g.id = ?`).get(id) as GameRow | undefined;
  if (!row) return null;
  const { data } = d.prepare("SELECT data FROM moves WHERE id = ?").get(id) as { data: Uint8Array };
  return { ...row, moves: decodeMoves(data) };
}
