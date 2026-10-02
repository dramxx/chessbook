// Joins db/games.db.partN back into db/games.db (Vercel rejects files over 100 MB, so only the
// parts are uploaded). Runs before `next build`; does nothing when games.db already exists.
import { existsSync, readdirSync, readFileSync, appendFileSync } from "node:fs";

const DB = "db/games.db";
if (!existsSync(DB)) {
  const parts = readdirSync("db")
    .filter((f) => /^games\.db\.part\d+$/.test(f))
    .sort((a, b) => Number(a.slice(12)) - Number(b.slice(12)));
  if (parts.length === 0) throw new Error("db/games.db.part* missing: run scripts/import-games.mjs");
  for (const p of parts) appendFileSync(DB, readFileSync(`db/${p}`));
  console.log(`Joined ${parts.length} parts into ${DB}`);
}
