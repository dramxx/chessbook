// Builds public/punish-repertoire.json: the opponent's common mistakes inside the opening courses.
// For every course position where the opponent is to move, the club statistics the course build
// cached (data/course-cache.json) give the moves actually played; Stockfish keeps the ones that throw
// away at least a pawn, as in scripts/build-punish.mjs. No Lichess requests.
// Evaluations are cached in data/punish-rep-cache.json, so an interrupted run resumes.
// Usage: node scripts/build-punish-repertoire.mjs
import { Chess } from "chess.js";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { enginePool } from "./stockfish.mjs";
import { COURSES } from "./courses.mjs";

const MIN_GAMES = 300; // a move must be this common in the course's club statistics...
const MIN_SHARE = 0.03; // ...and this common in its position
const DEPTH = 18;
const REPLY_DEPTH = 20;
const REPLIES = 5;
const MIN_DROP = 100;
const MIN_EVAL = 100;
const MIN_BEFORE = -100;
const ENGINES = 6;
const CACHE = "data/punish-rep-cache.json";

const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");
// Short stable id for a position (FNV-1a).
const hash = (text) => {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h.toString(36);
};
const explorer = JSON.parse(readFileSync("data/course-cache.json", "utf8")).explorer;
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
let unsaved = 0;
const save = () => {
  mkdirSync("data", { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  unsaved = 0;
};
process.on("SIGINT", () => {
  save();
  process.exit(130);
});

const engines = enginePool(ENGINES);
const pending = new Map();
function evaluate(fen, depth = DEPTH, multipv = 1) {
  const key = `${epd(fen)}|${depth}|${multipv}`;
  if (cache[key]) return Promise.resolve(cache[key]);
  if (!pending.has(key)) {
    pending.set(
      key,
      engines.analyse(fen, depth, multipv).then((lines) => {
        if (!lines.length) lines = [{ cp: -10000, pv: [] }];
        cache[key] = lines;
        if (++unsaved >= 50) save();
        return lines;
      }),
    );
  }
  return pending.get(key);
}

// Opponent-to-move positions of every course line, with the moves that lead there (first route wins).
const nodes = new Map(); // epd -> { fen, path, courses: Set }
for (const file of readdirSync("src/lib/courses").filter((f) => f.endsWith("-lines.json"))) {
  const course = file.replace("-lines.json", "");
  const side = COURSES[course]?.side;
  if (!side) continue;
  for (const lines of Object.values(JSON.parse(readFileSync(`src/lib/courses/${file}`, "utf8")))) {
    for (const line of lines) {
      const chess = new Chess();
      const path = [];
      for (const san of line.moves.split(" ")) {
        if (chess.turn() !== side) {
          const key = epd(chess.fen());
          const node = nodes.get(key) ?? nodes.set(key, { fen: chess.fen(), path: [...path], courses: new Set() }).get(key);
          node.courses.add(course);
        }
        path.push(chess.move(san).san);
      }
    }
  }
}
console.log(`${nodes.size} opponent positions in the courses`);

const judged = [];
for (const [key, node] of nodes) {
  const data = explorer[key];
  if (!data?.total) continue;
  const before = evaluate(node.fen);
  for (const [san, games] of data.moves) {
    if (games < MIN_GAMES || games / data.total < MIN_SHARE) continue;
    const chess = new Chess(node.fen);
    chess.move(san);
    const fen = chess.fen();
    judged.push(
      Promise.all([before, evaluate(fen)]).then(([[best], [after]]) => {
        const drop = best.cp + after.cp;
        if (best.cp < MIN_BEFORE || after.cp < MIN_EVAL || drop < MIN_DROP) return null;
        evaluate(fen, REPLY_DEPTH, REPLIES);
        return { fen, path: [...node.path, san], games, share: games / data.total, drop, courses: [...node.courses] };
      }),
    );
  }
}
console.log(`judging ${judged.length} moves...`);
const found = (await Promise.all(judged)).filter(Boolean);

const out = await Promise.all(
  found.map(async (m) => {
    const lines = await evaluate(m.fen, REPLY_DEPTH, REPLIES);
    return {
      id: `r${hash(epd(m.fen))}`,
      fen: m.fen,
      moves: m.path.join(" "),
      opening: null,
      games: m.games,
      share: Math.round(m.share * 1000) / 1000,
      drop: m.drop,
      courses: m.courses,
      replies: lines.map(({ cp, pv }) => [new Chess(m.fen).move(pv[0]).san, pv[0], cp]),
      pv: lines[0].pv.slice(0, 8).join(" "),
    };
  }),
);
save();
engines.quit();
writeFileSync("public/punish-repertoire.json", JSON.stringify(out));
console.log(`Wrote ${out.length} repertoire positions to public/punish-repertoire.json`);
