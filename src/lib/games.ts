import { createClient, type ResultSet } from "@libsql/client";
import { decodeMoves } from "@/lib/movecodec.mjs";

// Server-only, read-only access to the games database on Turso (built by scripts/import-games.mjs,
// uploaded by scripts/upload-turso.mjs).

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
// Turso's free plan meters rows read, and a deep page reads every row before it.
const MAX_PAGE = 199;

const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });

// Rows as plain objects keyed by column name.
const rowsOf = <T>(r: ResultSet) => r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])) as T);

const SELECT = `SELECT g.id, w.name AS white, b.name AS black, g.white_elo AS whiteElo, g.black_elo AS blackElo,
  e.name AS event, e.site, g.date, g.year, g.round, g.result, g.eco, g.plies
FROM games g JOIN players w ON w.id = g.white JOIN players b ON b.id = g.black LEFT JOIN events e ON e.id = g.event`;

// Newest first. Returns one page and whether another follows.
export async function searchGames(s: Search): Promise<{ games: GameRow[]; more: boolean }> {
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
  const page = Math.min(s.page ?? 0, MAX_PAGE);
  const sql = `${SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY g.year DESC, g.id DESC LIMIT ${PAGE_SIZE + 1} OFFSET ${page * PAGE_SIZE}`;
  const rows = rowsOf<GameRow>(await db.execute({ sql, args: params }));
  return { games: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE && page < MAX_PAGE };
}

export async function getGame(id: number): Promise<(GameRow & { moves: string[] }) | null> {
  const [game, moves] = await db.batch(
    [
      { sql: `${SELECT} WHERE g.id = ?`, args: [id] },
      { sql: "SELECT data FROM moves WHERE id = ?", args: [id] },
    ],
    "read",
  );
  const [row] = rowsOf<GameRow>(game);
  if (!row) return null;
  return { ...row, moves: decodeMoves(new Uint8Array(moves.rows[0].data as ArrayBuffer)) };
}
