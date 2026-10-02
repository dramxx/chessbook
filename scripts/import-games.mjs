// Builds the SQLite games database db/games.db from PGN files.
// Source: Lumbra's GigaBase OTB (https://lumbrasgigabase.com/en/download-in-pgn-format-en/), CC BY-NC-SA 4.0.
// "OTB Elite - ELO > 2400" (131 MB .7z, 764 MB PGN, ~864k games) is a public Mega link; unpack it into ./data.
//
// Usage: node scripts/import-games.mjs [--min-elo 2300] data/file.pgn [more.pgn]
//   --min-elo  keep only games where both players are rated at least this (default 2300)
//
// Each game is tagged with the deepest named opening (public/openings.json, so run
// build-openings.mjs first) that its first OPENING_PLIES positions reach.
//
// The database is rebuilt from scratch on every run. Moves are stored one byte per move
// (src/lib/movecodec.mjs). Vercel rejects files over 100 MB, so the result is also written as
// db/games.db.partN chunks; scripts/join-db.mjs joins them back during the Vercel build.
import { createReadStream, rmSync, mkdirSync, statSync, openSync, readSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { Chess } from "chessops/chess";
import { makeFen } from "chessops/fen";
import { parseSan } from "chessops/san";
import { encodeMoves } from "../src/lib/movecodec.mjs";

const DB = "db/games.db";
const PART = 95_000_000;
const OPENING_PLIES = 40;

const args = process.argv.slice(2);
let minElo = 2300;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--min-elo") minElo = Number(args[++i]);
  else files.push(args[i]);
}
if (files.length === 0 || Number.isNaN(minElo)) {
  console.error("Usage: node scripts/import-games.mjs [--min-elo 2300] file.pgn [more.pgn]");
  process.exit(1);
}

const TAG = /^\[(\w+)\s+"(.*)"\]\s*$/;
const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/;

const known = (v) => (v && v !== "?" && v !== "-" ? v : null);
const elo = (v) => {
  const n = Number(v);
  return n > 0 ? n : null;
};

// Movetext to plain SAN tokens: no move numbers, comments, variations, annotations or result.
function parseMoves(text) {
  text = text.replace(/\{[^}]*\}/g, " ");
  for (let prev; prev !== text; ) {
    prev = text;
    text = text.replace(/\([^()]*\)/g, " ");
  }
  return text
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !RESULT.test(t))
    .map((t) => t.replace(/[!?]+$/, ""));
}

mkdirSync("db", { recursive: true });
for (const f of readdirSync("db")) if (f.startsWith("games.db")) rmSync(`db/${f}`);
const db = new DatabaseSync(DB);
db.exec(`
PRAGMA journal_mode = OFF;
PRAGMA synchronous = OFF;
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE events (id INTEGER PRIMARY KEY, name TEXT, site TEXT, UNIQUE (name, site));
CREATE TABLE openings (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, eco TEXT NOT NULL);
CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  white INTEGER NOT NULL REFERENCES players,
  black INTEGER NOT NULL REFERENCES players,
  white_elo INTEGER,
  black_elo INTEGER,
  event INTEGER REFERENCES events,
  date TEXT,
  year INTEGER,
  round TEXT,
  result TEXT NOT NULL,
  eco TEXT,
  opening INTEGER REFERENCES openings,
  plies INTEGER NOT NULL
);
CREATE TABLE moves (id INTEGER PRIMARY KEY, data BLOB NOT NULL);
`);

const players = new Map();
const events = new Map();
const addPlayer = db.prepare("INSERT INTO players (id, name) VALUES (?, ?)");
const addEvent = db.prepare("INSERT INTO events (id, name, site) VALUES (?, ?, ?)");
const addGame = db.prepare(
  "INSERT INTO games (id, white, black, white_elo, black_elo, event, date, year, round, result, eco, opening, plies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);

// Opening names by position (first four FEN fields), each name stored once.
const openingAt = new Map();
const addOpening = db.prepare("INSERT INTO openings (id, name, eco) VALUES (?, ?, ?)");
const openingIds = new Map();
for (const [epd, node] of Object.entries(JSON.parse(readFileSync("public/openings.json", "utf8")))) {
  if (!node.name) continue;
  let id = openingIds.get(node.name);
  if (id === undefined) {
    id = openingIds.size + 1;
    openingIds.set(node.name, id);
    addOpening.run(id, node.name, node.eco);
  }
  openingAt.set(epd, id);
}

// Deepest named opening position among the game's first OPENING_PLIES positions.
function openingOf(sans) {
  const pos = Chess.default();
  let found = null;
  for (const san of sans.slice(0, OPENING_PLIES)) {
    pos.play(parseSan(pos, san));
    found = openingAt.get(makeFen(pos.toSetup()).split(" ").slice(0, 4).join(" ")) ?? found;
  }
  return found;
}
const addMoves = db.prepare("INSERT INTO moves (id, data) VALUES (?, ?)");

function playerId(name) {
  let id = players.get(name);
  if (id === undefined) {
    id = players.size + 1;
    players.set(name, id);
    addPlayer.run(id, name);
  }
  return id;
}

function eventId(name, site) {
  if (!name && !site) return null;
  const key = `${name}\u0000${site}`;
  let id = events.get(key);
  if (id === undefined) {
    id = events.size + 1;
    events.set(key, id);
    addEvent.run(id, name, site);
  }
  return id;
}

let read = 0;
let kept = 0;
let illegal = 0;

function add(tags, movetext) {
  read++;
  if (read % 100000 === 0) console.log(`${read} games read, ${kept} kept`);
  // Games from a set-up position or a variant can't be replayed from the start position.
  if (tags.FEN || tags.SetUp === "1" || (tags.Variant && tags.Variant !== "Standard")) return;
  const whiteElo = elo(tags.WhiteElo);
  const blackElo = elo(tags.BlackElo);
  if (!(whiteElo >= minElo && blackElo >= minElo)) return;
  const sans = parseMoves(movetext);
  if (sans.length === 0) return;
  const bytes = encodeMoves(sans);
  if (!bytes) {
    illegal++;
    return;
  }
  const date = known(tags.Date);
  const year = /^\d{4}/.test(date ?? "") ? Number(date.slice(0, 4)) : null;
  const eco = known(tags.ECO)?.slice(0, 3) ?? null;
  const id = ++kept;
  addGame.run(
    id, playerId(tags.White ?? "?"), playerId(tags.Black ?? "?"), whiteElo, blackElo,
    eventId(known(tags.Event), known(tags.Site)), date, year, known(tags.Round),
    RESULT.test(tags.Result ?? "") ? tags.Result : "*", eco, openingOf(sans), bytes.length,
  );
  addMoves.run(id, bytes);
}

db.exec("BEGIN");
for (const file of files) {
  console.log(`Reading ${file}`);
  let tags = {};
  let movetext = "";
  let inMoves = false;
  for await (const line of createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity })) {
    const tag = TAG.exec(line);
    if (tag) {
      if (inMoves) {
        add(tags, movetext);
        tags = {};
        movetext = "";
        inMoves = false;
      }
      tags[tag[1]] = tag[2];
    } else if (line.trim() && !line.startsWith("%")) {
      inMoves = true;
      movetext += " " + line.replace(/;.*$/, "");
    }
  }
  if (inMoves) add(tags, movetext);
}
db.exec("COMMIT");
console.log(`Imported ${kept} of ${read} games (${illegal} skipped with illegal moves). Building indexes...`);

db.exec(`
CREATE INDEX games_white ON games (white);
CREATE INDEX games_black ON games (black);
CREATE INDEX games_event ON games (event);
CREATE INDEX games_year ON games (year);
CREATE INDEX games_eco ON games (eco);
CREATE INDEX games_opening ON games (opening);
ANALYZE;
`);
db.exec("VACUUM");
db.close();

const size = statSync(DB).size;
const fd = openSync(DB, "r");
const buf = Buffer.alloc(PART);
let parts = 0;
for (let pos = 0; pos < size; pos += PART) {
  const n = readSync(fd, buf, 0, PART, pos);
  writeFileSync(`${DB}.part${parts++}`, buf.subarray(0, n));
}
console.log(`Done. ${DB}: ${(size / 1e6).toFixed(1)} MB in ${parts} part(s).`);
