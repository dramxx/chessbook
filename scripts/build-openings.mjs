// Builds public/openings.json from lichess-org/chess-openings (CC0).
// Output: { [epd]: { name?, eco?, moves?, next: { [san]: epd } } }, keyed by position (first four
// FEN fields) so transpositions share a node. `name`/`eco`/`moves` are set where a named line ends,
// `moves` keeping the line's own move order (space-separated SAN); other nodes are intermediate
// positions on the way to one.
// Usage: node scripts/build-openings.mjs
import { Chess } from "chess.js";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const epd = (chess) => chess.fen().split(" ").slice(0, 4).join(" ");

const nodes = {};
const node = (key) => (nodes[key] ??= { next: {} });
let lines = 0;
let duplicates = 0;

for (const file of ["a", "b", "c", "d", "e"]) {
  const res = await fetch(`${BASE}/${file}.tsv`);
  if (!res.ok) throw new Error(`Download of ${file}.tsv failed: ${res.status}`);
  const rows = (await res.text()).split(/\r?\n/).slice(1).filter(Boolean);
  for (const row of rows) {
    const [eco, name, pgn] = row.split("\t");
    const chess = new Chess();
    let from = node(epd(chess));
    const moves = [];
    for (const san of pgn.split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
      const { san: canonical } = chess.move(san); // throws on an illegal move
      const to = epd(chess);
      from.next[canonical] = to;
      from = node(to);
      moves.push(canonical);
    }
    if (from.name) {
      duplicates++; // two lines reach the same position: keep the first
    } else {
      from.name = name;
      from.eco = eco;
      from.moves = moves.join(" ");
    }
    lines++;
  }
}

mkdirSync("public", { recursive: true });
writeFileSync("public/openings.json", JSON.stringify(nodes));
console.log(`${lines} lines -> ${Object.keys(nodes).length} positions (${duplicates} transpositions to an already named position)`);
