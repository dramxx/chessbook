import { createClient } from "@libsql/client";
import { MAX_NAME, MAX_SCORE, MODES, TOP, type Mode, type Score } from "@/lib/best";

// High scores live in the games database, in a table the import/upload scripts don't touch.
// No accounts, so a score is whatever the browser sends; the checks below only reject nonsense.
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });

let ready: Promise<unknown> | null = null;
const init = () =>
  (ready ??= db
    .batch([
      "CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, mode TEXT NOT NULL, name TEXT NOT NULL, score INTEGER NOT NULL, at INTEGER NOT NULL)",
      "CREATE INDEX IF NOT EXISTS scores_top ON scores (mode, score DESC, at)",
    ])
    .catch((e) => {
      ready = null;
      throw e;
    }));

// Ties go to whoever got there first.
async function top(mode: Mode): Promise<Score[]> {
  await init();
  const r = await db.execute({
    sql: `SELECT name, score FROM scores WHERE mode = ? ORDER BY score DESC, at LIMIT ${TOP}`,
    args: [mode],
  });
  return r.rows.map((row) => ({ name: String(row.name), score: Number(row.score) }));
}

const isMode = (m: unknown): m is Mode => MODES.includes(m as Mode);
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  if (!isMode(mode)) return Response.json({ error: "unknown mode" }, { status: 400 });
  return Response.json(await top(mode), { headers });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const score = body?.score;
  if (!isMode(body?.mode) || !name || name.length > MAX_NAME || !Number.isInteger(score) || score < 1 || score > MAX_SCORE)
    return Response.json({ error: "invalid score" }, { status: 400 });
  await init();
  await db.execute({
    sql: "INSERT INTO scores (mode, name, score, at) VALUES (?, ?, ?, ?)",
    args: [body.mode, name, score, Date.now()],
  });
  return Response.json(await top(body.mode), { headers });
}
