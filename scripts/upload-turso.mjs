// Copies db/games.db (built by scripts/import-games.mjs) into the Turso database the app reads.
// Run: node --env-file=.env.local scripts/upload-turso.mjs
// Resumable: each table continues after the highest id already uploaded. Indexes come last.
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";

const local = new DatabaseSync("db/games.db", { readOnly: true });
const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const ROWS_PER_INSERT = 1000;
const TABLES = ["players", "events", "openings", "games", "moves"];

const schema = local.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL").all();
for (const t of TABLES) {
  const { sql } = schema.find((s) => s.type === "table" && s.name === t);
  await turso.execute(sql.replace(/^CREATE TABLE/, "CREATE TABLE IF NOT EXISTS"));
}

for (const t of TABLES) {
  const total = local.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
  let last = Number((await turso.execute(`SELECT coalesce(max(id), 0) AS m FROM ${t}`)).rows[0].m);
  const columns = local.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  const page = local.prepare(`SELECT * FROM ${t} WHERE id > ? ORDER BY id LIMIT ${ROWS_PER_INSERT}`);
  const row = `(${columns.map(() => "?").join(", ")})`;
  for (;;) {
    const rows = page.all(last);
    if (!rows.length) break;
    await turso.execute({
      sql: `INSERT INTO ${t} (${columns.join(", ")}) VALUES ${rows.map(() => row).join(", ")}`,
      args: rows.flatMap((r) => columns.map((c) => r[c])),
    });
    last = rows.at(-1).id;
    const done = Number(local.prepare(`SELECT count(*) AS n FROM ${t} WHERE id <= ?`).get(last).n);
    process.stdout.write(`\r${t}: ${done}/${total}`);
  }
  console.log(`\r${t}: done (${total} rows)        `);
}

for (const s of schema.filter((s) => s.type === "index")) {
  await turso.execute(s.sql.replace(/^CREATE INDEX/, "CREATE INDEX IF NOT EXISTS"));
  console.log(`index ${s.name}: done`);
}
await turso.execute("ANALYZE");
console.log("Upload complete.");
