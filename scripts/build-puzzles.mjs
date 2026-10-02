// Builds public/puzzles.json from the Lichess puzzle database (CC0).
// Streams the .zst download and stops once every rating bucket is full.
// Usage: node scripts/build-puzzles.mjs
import { Decompress } from "fzstd";
import { writeFileSync, mkdirSync } from "node:fs";

const URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const MIN = 400;
const MAX = 3000;
const STEP = 50;
const PER_BUCKET = 100;

const buckets = new Map(); // bucket start rating -> puzzles
for (let r = MIN; r < MAX; r += STEP) buckets.set(r, []);
let unfilled = buckets.size;
let leftover = "";
let done = false;
let seen = 0;

function handleLine(line) {
  // PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
  const [id, fen, moves, rating, dev, pop, plays] = line.split(",");
  const r = Number(rating);
  if (!(r >= MIN && r < MAX)) return;
  if (Number(dev) > 90 || Number(pop) < 85 || Number(plays) < 300) return;
  const bucket = buckets.get(MIN + Math.floor((r - MIN) / STEP) * STEP);
  if (bucket.length >= PER_BUCKET) return;
  bucket.push([id, fen, moves, r]);
  if (bucket.length === PER_BUCKET && --unfilled === 0) done = true;
}

const decoder = new TextDecoder();
const zstd = new Decompress((chunk) => {
  if (done) return;
  const lines = (leftover + decoder.decode(chunk, { stream: true })).split("\n");
  leftover = lines.pop();
  for (const line of lines) {
    if (++seen === 1 || !line) continue; // header
    handleLine(line);
    if (done) return;
  }
});

const res = await fetch(URL);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const reader = res.body.getReader();
let bytes = 0;
while (!done) {
  const { value, done: eof } = await reader.read();
  if (eof) break;
  bytes += value.length;
  zstd.push(value);
  if (bytes % (20 << 20) < value.length) {
    console.log(`${(bytes / 1e6).toFixed(0)} MB, ${seen} lines, ${unfilled} buckets unfilled`);
  }
}
reader.cancel().catch(() => {});

const puzzles = [...buckets.values()].flat().sort((a, b) => a[3] - b[3]);
mkdirSync("public", { recursive: true });
writeFileSync("public/puzzles.json", JSON.stringify(puzzles));
console.log(`Wrote ${puzzles.length} puzzles (${unfilled} buckets not full) after ${seen} lines.`);
