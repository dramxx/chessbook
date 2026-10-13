// Builds public/punish.json: opening mistakes club players actually make, with the replies that punish them.
// Crawls the Lichess explorer over amateur games (most-played position first, up to a budget), has
// Stockfish evaluate every frequently played move, and keeps the ones that throw away at least a pawn.
// Explorer answers and evaluations are cached in data/punish-cache.json, so an interrupted run resumes.
// Usage: node --env-file=.env.local scripts/build-punish.mjs [maxPositions]
import { Chess } from "chess.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { enginePool } from "./stockfish.mjs";

const MAX_POSITIONS = Number(process.argv[2] ?? 3000);
const RATINGS = "1400,1600,1800"; // 1400-1999
const SPEEDS = "blitz,rapid,classical";
const MAX_PLY = 20;
const MIN_GAMES = 20000; // a move must be played this often to be crawled or judged
const DEPTH = 18;
const REPLY_DEPTH = 20;
const REPLIES = 5; // punishing replies stored per mistake
const MIN_DROP = 100; // centipawns the mistake must lose
const MIN_EVAL = 100; // punisher's advantage after the mistake
const MIN_BEFORE = -100; // the mover must not already have been worse than this
const ENGINES = 6;
const GAP_MS = 2000; // pause after each explorer request, which is rate limited
const CACHE = "data/punish-cache.json";

const token = process.env.LICHESS_TOKEN;
if (!token) throw new Error("LICHESS_TOKEN missing: run with --env-file=.env.local");

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

// --- Lichess explorer -------------------------------------------------------------------------

async function explore(fen) {
  const key = epd(fen);
  if (cache.explorer[key]) return cache.explorer[key];
  const url =
    `https://explorer.lichess.ovh/lichess?variant=standard&speeds=${SPEEDS}&ratings=${RATINGS}` +
    `&moves=12&topGames=0&recentGames=0&fen=${encodeURIComponent(fen)}`;
  for (;;) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      // Trimmed to what the build uses: [san, white, draws, black, opening name].
      const entry = {
        opening: data.opening?.name ?? null,
        moves: data.moves.map((m) => [m.san, m.white, m.draws, m.black, m.opening?.name ?? null]),
      };
      cache.explorer[key] = entry;
      if (++unsaved >= 50) save();
      await new Promise((r) => setTimeout(r, GAP_MS));
      return entry;
    }
    const wait = res?.status === 429 ? 60 : 10;
    console.log(`explorer ${res?.status ?? "unreachable"}, retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

const engines = enginePool(ENGINES);

// Cached by position, so transpositions are searched once.
const pending = new Map();
function evaluate(fen, depth = DEPTH, multipv = 1) {
  const key = `${epd(fen)}|${depth}|${multipv}`;
  if (cache.eval[key]) return Promise.resolve(cache.eval[key]);
  if (!pending.has(key)) {
    pending.set(
      key,
      engines.analyse(fen, depth, multipv).then((lines) => {
        if (!lines.length) lines = [{ cp: -10000, pv: [] }]; // checkmated or stalemated: no moves
        cache.eval[key] = lines;
        if (++unsaved >= 50) save();
        return lines;
      }),
    );
  }
  return pending.get(key);
}

// --- Crawl: most-played position first -------------------------------------------------------

const frontier = [{ fen: new Chess().fen(), path: [], games: Infinity, opening: null }];
const queued = new Set([epd(frontier[0].fen)]);
const judged = []; // promises of mistake candidates (or null)
let crawled = 0;

while (frontier.length && crawled < MAX_POSITIONS) {
  let top = 0;
  for (let i = 1; i < frontier.length; i++) if (frontier[i].games > frontier[top].games) top = i;
  const pos = frontier.splice(top, 1)[0];
  const data = await explore(pos.fen);
  crawled++;
  const opening = data.opening ?? pos.opening;
  if (crawled % 25 === 0) {
    console.log(`${crawled}/${MAX_POSITIONS} positions, frontier ${frontier.length}, ply ${pos.path.length}: ${pos.path.join(" ")}`);
  }

  const before = evaluate(pos.fen);
  for (const [san, white, draws, black, moveOpening] of data.moves) {
    const games = white + draws + black;
    if (games < MIN_GAMES) continue;
    const chess = new Chess(pos.fen);
    const mover = chess.turn();
    chess.move(san);
    const fen = chess.fen();
    const path = [...pos.path, san];
    const name = moveOpening ?? opening;

    judged.push(
      Promise.all([before, evaluate(fen)]).then(([[best], [after]]) => {
        const drop = best.cp + after.cp; // mover's best minus mover's eval after the move
        if (best.cp < MIN_BEFORE || after.cp < MIN_EVAL || drop < MIN_DROP) return null;
        evaluate(fen, REPLY_DEPTH, REPLIES); // start the reply search while the crawl goes on
        const moverPoints = mover === "w" ? white + draws / 2 : black + draws / 2;
        return { fen, path, opening: name, games, score: Math.round((100 * moverPoints) / games), drop, eval: after.cp };
      }),
    );

    if (path.length < MAX_PLY && !queued.has(epd(fen))) {
      queued.add(epd(fen));
      frontier.push({ fen, path, games, opening: name });
    }
  }
}

console.log(`Crawl done (${crawled} positions); waiting for the engines...`);
const found = (await Promise.all(judged)).filter(Boolean);

// One entry per resulting position (transpositions), keeping the most played move order.
const byPosition = new Map();
for (const m of found) {
  const key = epd(m.fen);
  const prev = byPosition.get(key);
  if (!prev || m.games > prev.games) byPosition.set(key, { ...m, games: m.games + (prev?.games ?? 0) });
  else prev.games += m.games;
}
const mistakes = [...byPosition.values()].sort((a, b) => b.games - a.games);

console.log(`${mistakes.length} mistakes; searching their punishing replies...`);
const out = await Promise.all(
  mistakes.map(async (m, i) => {
    const lines = await evaluate(m.fen, REPLY_DEPTH, REPLIES);
    const replies = lines.map(({ cp, pv }) => [new Chess(m.fen).move(pv[0]).san, pv[0], cp]);
    return {
      id: i + 1,
      fen: m.fen,
      moves: m.path.join(" "),
      opening: m.opening,
      games: m.games,
      score: m.score,
      drop: m.drop,
      replies, // [san, uci, cp] best first, cp for the punisher
      pv: lines[0].pv.slice(0, 8).join(" "),
    };
  }),
);

save();
engines.quit();
mkdirSync("public", { recursive: true });
writeFileSync("public/punish.json", JSON.stringify(out));
console.log(`Wrote ${out.length} positions to public/punish.json`);
