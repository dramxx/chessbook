// Builds the move tree of an opening course (src/lib/courses/<id>-lines.json) from data:
// - the course side's moves: the most played move in 2400+ games (db/games.db), checked by Stockfish
//   and replaced by its best move when it is clearly worse; the course's `choices` fix repertoire decisions;
// - the opponent's moves: what club players (Lichess, 1600-2200) actually play, plus the masters'
//   main moves; deep in the tree, where club games run out, the masters' moves alone.
// A line ends when it gets too rare (REACH: the share of the course's games that reach it), too long,
// or out of data. Each line also gets the strongest games from the database that follow it longest.
// Explorer answers and evaluations are cached in data/course-cache.json.
// Courses are configured in scripts/courses.mjs.
// Usage: node --env-file=.env.local scripts/build-course.mjs <course id> [--masters-only]
//   --masters-only: no Lichess requests (opponent moves from the masters only), for a quick dry run
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Chess } from "chessops/chess";
import { makeFen } from "chessops/fen";
import { makeSan, parseSan } from "chessops/san";
import { makeUci, parseUci } from "chessops/util";
import { decodeMoves } from "../src/lib/movecodec.mjs";
import { enginePool } from "./stockfish.mjs";
import { COURSES } from "./courses.mjs";

const id = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!COURSES[id]) throw new Error(`Usage: build-course.mjs <${Object.keys(COURSES).join("|")}> [--masters-only]`);
const COURSE = { id, ...COURSES[id] };

const MASTERS_ONLY = process.argv.includes("--masters-only");
const RATINGS = "1600,1800,2000,2200";
const SPEEDS = "blitz,rapid,classical";
// REACH: the share of the course's games that get to a position. An alternative opponent move becomes
// a new line from MIN_BRANCH; a line keeps following the most played reply down to MIN_CONTINUE.
const MIN_BRANCH = 0.002;
const MIN_CONTINUE = 0.0003;
const MAX_PLY = 28; // about move 14
const CLUB_SHARE = 0.02; // opponent moves played at least this often by club players...
const MASTER_SHARE = 0.15; // ...or by masters are covered
const MAX_BRANCHES = 8;
const CLUB_MIN_GAMES = 1000; // below this, club statistics are too thin: follow the masters
const MASTER_MIN_GAMES = 12;
const MAX_LOSS = 60; // centipawns the masters' move may lose to Stockfish's best before it is replaced
const DEPTH = 18;
const ENGINES = 6;
const GAP_MS = 2000;
const INDEX_PLIES = 40;
const MODEL_GAMES = 3;
const CACHE = "data/course-cache.json";

const token = process.env.LICHESS_TOKEN;
if (!token && !MASTERS_ONLY) throw new Error("LICHESS_TOKEN missing: run with --env-file=.env.local");

const fenOf = (pos) => makeFen(pos.toSetup());
const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : { explorer: {}, eval: {} };
let unsaved = 0;
function save() {
  mkdirSync("data", { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  unsaved = 0;
}
process.on("SIGINT", () => {
  save();
  console.log("\nCache saved; run again to resume.");
  process.exit(130);
});

// --- Masters: move statistics and best games per position, from the local database ------------

console.log("Indexing database games...");
const db = new DatabaseSync("db/games.db", { readOnly: true });
const rows = db
  .prepare(
    `SELECT g.id, g.white_elo, g.black_elo, g.year, m.data FROM games g JOIN moves m ON m.id = g.id
     WHERE ${COURSE.eco.map(() => "g.eco BETWEEN ? AND ?").join(" OR ")}`,
  )
  .all(...COURSE.eco.flat());
const masterMoves = new Map(); // epd -> Map(san -> games)
const masterGames = new Map(); // epd -> best games reaching it: [{ id, elo }]
for (const row of rows) {
  const sans = decodeMoves(row.data.subarray(0, INDEX_PLIES));
  if (COURSE.root.some((san, i) => sans[i] !== san)) continue;
  const elo = ((row.white_elo ?? 2400) + (row.black_elo ?? 2400)) / 2;
  const pos = Chess.default();
  for (const san of sans) {
    const key = epd(fenOf(pos));
    const moves = masterMoves.get(key) ?? masterMoves.set(key, new Map()).get(key);
    moves.set(san, (moves.get(san) ?? 0) + 1);
    pos.play(parseSan(pos, san));
    const after = epd(fenOf(pos));
    const best = masterGames.get(after) ?? masterGames.set(after, []).get(after);
    best.push({ id: row.id, elo });
    if (best.length > MODEL_GAMES * 4) {
      best.sort((a, b) => b.elo - a.elo);
      best.length = MODEL_GAMES;
    }
  }
}
for (const best of masterGames.values()) {
  best.sort((a, b) => b.elo - a.elo);
  best.length = Math.min(best.length, MODEL_GAMES);
}
console.log(`${rows.length} games, ${masterMoves.size} positions`);

// --- Club players: Lichess explorer ------------------------------------------------------------

async function club(fen) {
  if (MASTERS_ONLY) return null;
  const key = epd(fen);
  if (cache.explorer[key]) return cache.explorer[key];
  const url =
    `https://explorer.lichess.ovh/lichess?variant=standard&speeds=${SPEEDS}&ratings=${RATINGS}` +
    `&moves=12&topGames=0&recentGames=0&fen=${encodeURIComponent(fen)}`;
  for (;;) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      const entry = {
        opening: data.opening?.name ?? null,
        total: data.white + data.draws + data.black,
        moves: data.moves.map((m) => [m.san, m.white + m.draws + m.black]),
      };
      cache.explorer[key] = entry;
      if (++unsaved >= 25) save();
      await new Promise((r) => setTimeout(r, GAP_MS));
      return entry;
    }
    const wait = res?.status === 429 ? 60 : 10;
    console.log(`explorer ${res?.status ?? "unreachable"}, retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

// --- Stockfish ----------------------------------------------------------------------------------

const engines = enginePool(ENGINES);
async function evaluate(fen, uci) {
  const key = `${epd(fen)}|${uci ?? ""}|${DEPTH}`;
  if (!cache.eval[key]) {
    const [line] = await engines.analyse(fen, DEPTH, 1, uci ? [uci] : []);
    cache.eval[key] = { cp: line.cp, best: line.pv[0] };
    if (++unsaved >= 25) save();
  }
  return cache.eval[key];
}

// --- Tree walk ----------------------------------------------------------------------------------

function share(moves, total) {
  return moves.map(([san, n]) => ({ san, share: n / total }));
}

// The course side's move: the fixed choice, else the masters' most played, unless Stockfish
// finds it clearly worse than its own best.
async function ourMove(pos, line) {
  const fen = fenOf(pos);
  const stats = [...(masterMoves.get(epd(fen)) ?? [])].sort((a, b) => b[1] - a[1]);
  const total = stats.reduce((n, [, g]) => n + g, 0);
  const preferred = COURSE.choices[line.join(" ")] ?? (total >= MASTER_MIN_GAMES ? stats[0][0] : null);
  const best = await evaluate(fen);
  const engineMove = () => ({ san: makeSan(pos, parseUci(best.best)), why: "engine" });
  if (!preferred) return engineMove();
  const uci = makeUci(parseSan(pos, preferred));
  if (uci === best.best) return { san: preferred, why: "masters" };
  const own = await evaluate(fen, uci);
  if (best.cp - own.cp > MAX_LOSS && !COURSE.choices[line.join(" ")]) {
    const replaced = engineMove();
    console.log(`  ${line.join(" ")}: masters' ${preferred} loses ${best.cp - own.cp}cp, using ${replaced.san}`);
    return replaced;
  }
  return { san: preferred, why: COURSE.choices[line.join(" ")] ? "choice" : "masters" };
}

// Opponent moves to cover, with the share of games each takes.
async function theirMoves(pos) {
  const fen = fenOf(pos);
  const clubData = await club(fen);
  const stats = [...(masterMoves.get(epd(fen)) ?? [])];
  const masterTotal = stats.reduce((n, [, g]) => n + g, 0);
  const clubShares = clubData && clubData.total >= CLUB_MIN_GAMES ? share(clubData.moves, clubData.total) : [];
  const masterShares = masterTotal >= MASTER_MIN_GAMES ? share(stats, masterTotal) : [];
  const picked = new Map();
  for (const m of clubShares) if (m.share >= CLUB_SHARE) picked.set(m.san, m.share);
  for (const m of masterShares) {
    if (m.share < MASTER_SHARE || picked.has(m.san)) continue;
    // A masters' move rare in club play still counts, weighted by its club share when known.
    picked.set(m.san, clubShares.length ? (clubShares.find((c) => c.san === m.san)?.share ?? 0.01) : m.share);
  }
  return [...picked].sort((a, b) => b[1] - a[1]).slice(0, MAX_BRANCHES);
}

// Per line: `reach` after each move, and per move whether it was the most played (our moves always are).
const lines = []; // { moves, reach: number[], top: boolean[], transposes }
const seen = new Set();
const enginePicks = []; // our moves chosen by Stockfish, for review
let nodes = 0;

async function walk(pos, moves, reaches, top) {
  const key = epd(fenOf(pos));
  const reach = reaches.at(-1);
  if (seen.has(key)) {
    lines.push({ moves, reach: reaches, top, transposes: true });
    return;
  }
  seen.add(key);
  const ourTurn = pos.turn[0] === COURSE.side;

  if (ourTurn) {
    const { san, why } = await ourMove(pos, moves);
    if (why === "engine") enginePicks.push(`${moves.join(" ")} ${san}`);
    const next = pos.clone();
    next.play(parseSan(pos, san));
    return walk(next, [...moves, san], [...reaches, reach], [...top, true]);
  }

  if (++nodes % 20 === 0) console.log(`${nodes} positions, ${lines.length} lines, at ${moves.join(" ")}`);
  const options = moves.length >= MAX_PLY || reach < MIN_CONTINUE ? [] : await theirMoves(pos);
  const children = options.filter(([, s], i) => reach * s >= (i === 0 ? MIN_CONTINUE : MIN_BRANCH));
  if (!children.length) {
    lines.push({ moves, reach: reaches, top, transposes: false });
    return;
  }
  for (const [i, [san, s]] of children.entries()) {
    const next = pos.clone();
    next.play(parseSan(pos, san));
    await walk(next, [...moves, san], [...reaches, reach * s], [...top, i === 0]);
  }
}

const start = Chess.default();
for (const san of COURSE.root) start.play(parseSan(start, san));
// The root moves count as the main line.
await walk(start, [...COURSE.root], COURSE.root.map(() => 1), COURSE.root.map(() => true));
save();
engines.quit();

// --- Output -------------------------------------------------------------------------------------

function chapterOf(moves) {
  const text = moves.join(" ");
  let best = null;
  for (const chapter of COURSE.chapters) {
    for (const prefix of chapter.prefixes) {
      if ((text === prefix || text.startsWith(prefix + " ") || prefix === "") && (!best || prefix.length > best.prefix.length)) {
        best = { chapter, prefix };
      }
    }
  }
  return best;
}

const gameInfo = db.prepare(
  `SELECT w.name AS white, b.name AS black, g.year, g.result FROM games g
   JOIN players w ON w.id = g.white JOIN players b ON b.id = g.black WHERE g.id = ?`,
);

// Opening names from public/openings.json (scripts/build-openings.mjs), by position.
const book = JSON.parse(readFileSync("public/openings.json", "utf8"));

const positionsOf = (moves) => {
  const pos = Chess.default();
  return moves.map((san) => {
    pos.play(parseSan(pos, san));
    return epd(fenOf(pos));
  });
};
const theirs = (i) => (i % 2 === 0) !== (COURSE.side === "w"); // the opponent's move at ply i
const label = (i, san) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : `${(i + 1) / 2}...${san}`);
const titleOf = (line, from) => {
  // The first opponent move after the chapter's start, then wherever the line leaves the main moves.
  const marks = [];
  for (let i = from; i < line.moves.length; i++) {
    if (theirs(i) && (marks.length === 0 || !line.top[i])) marks.push(label(i, line.moves[i]));
  }
  if (marks.length) return marks.join(" · ");
  // A move-order line that ends inside the chapter's prefix: named after its own opponent move.
  const own = line.moves.findLastIndex((_, i) => theirs(i) && !line.top[i]);
  return own >= 0 ? label(own, line.moves[own]) : "Main line";
};

const out = Object.fromEntries(COURSE.chapters.map((c) => [c.id, []]));
const lineAt = new Map(); // epd -> id of the first line passing through it
for (const line of lines) {
  const { chapter, prefix } = chapterOf(line.moves);
  const from = prefix ? prefix.split(" ").length : COURSE.root.length;
  let title = titleOf(line, from);
  // Chapters entered by several move orders can repeat a title: add the opponent's last move before
  // the chapter starts, which tells the move orders apart.
  if (out[chapter.id].some((l) => l.title === title)) {
    const before = line.moves.findLastIndex((_, i) => i < from && theirs(i));
    if (before >= 0) title = `${label(before, line.moves[before])} · ${title}`;
  }
  const id = `${chapter.id}-${title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
  if (out[chapter.id].some((l) => l.id === id)) throw new Error(`duplicate line id ${id}`);
  const positions = positionsOf(line.moves);
  // How often the line comes up: the reach of its own branch, i.e. its last opponent move that wasn't
  // the most played, or else its first opponent move in the chapter.
  let branch = Math.min(theirs(from) ? from : from + 1, line.moves.length - 1);
  line.top.forEach((top, i) => {
    if (!top && i >= from) branch = i;
  });
  // Best games following the line longest, opened where they leave it (`ply`).
  let ids = [];
  let ply = 0;
  positions.forEach((key, i) => {
    const found = masterGames.get(key);
    if (found?.length) {
      ids = found.map((g) => g.id);
      ply = i + 1;
    }
  });
  const name = positions.reduce((name, key) => book[key]?.name ?? name, null);
  let transposesTo = null;
  if (line.transposes) transposesTo = lineAt.get(positions.at(-1)) ?? null;
  for (const key of positions) if (!lineAt.has(key)) lineAt.set(key, id);
  out[chapter.id].push({
    id,
    title,
    name,
    moves: line.moves.join(" "),
    reach: Math.round(line.reach[branch] * 1000) / 1000,
    ...(transposesTo && { transposesTo }),
    games: ids.map((gameId) => ({ id: gameId, ply, ...gameInfo.get(gameId) })),
  });
}
writeFileSync(`src/lib/courses/${COURSE.id}-lines.json`, JSON.stringify(out, null, 1));
for (const [id, list] of Object.entries(out)) console.log(`${id}: ${list.length} lines`);
console.log(`${lines.length} lines in total`);
console.log("Moves picked by Stockfish (no or unsound masters' move):");
for (const pick of enginePicks) console.log(`  ${pick}`);
