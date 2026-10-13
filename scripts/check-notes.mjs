// Checks course notes against the lines: every key must be legal and lie on some line (by position,
// so transpositions count), and lists the branch points (each line's first new opponent move and our
// reply) that still have no note. Also checks the ideas' diagram moves.
// Usage: node --experimental-strip-types scripts/check-notes.mjs <notes> [course ids...]
//   <notes>: the name of the notes and ideas files (src/lib/courses/<notes>-notes.ts, -ideas.ts)
//   course ids: courses sharing those files, whose lines are checked together (default: <notes>)
import { existsSync, readFileSync } from "node:fs";
import { Chess } from "chess.js";

const [base = "caro-kann", ...ids] = process.argv.slice(2);
const { NOTES } = await import(`../src/lib/courses/${base}-notes.ts`);
// Chapter id -> lines, over all the courses.
const chapters = {};
for (const id of ids.length ? ids : [base]) {
  for (const [chapter, lines] of Object.entries(JSON.parse(readFileSync(`src/lib/courses/${id}-lines.json`, "utf8")))) {
    (chapters[chapter] ??= []).push(...lines);
  }
}

const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");
// "position|move" for each move of a SAN sequence.
function keysOf(moves) {
  const chess = new Chess();
  return moves.map((san) => {
    const before = epd(chess.fen());
    return `${before}|${chess.move(san).san}`;
  });
}

const onLines = new Set();
const branchKeys = []; // [label, key]
const seen = new Set();
for (const lines of Object.values(chapters)) {
  for (const line of lines) {
    const moves = line.moves.split(" ");
    const keys = keysOf(moves);
    keys.forEach((k) => onLines.add(k));
    // The first move this line adds to the tree, and the reply after it.
    const first = moves.findIndex((_, i) => !seen.has(moves.slice(0, i + 1).join(" ")));
    moves.forEach((_, i) => seen.add(moves.slice(0, i + 1).join(" ")));
    for (const i of [first, first + 1]) {
      if (first >= 0 && i < moves.length) branchKeys.push([`${line.id}: ${moves.slice(0, i + 1).join(" ")}`, keys[i]]);
    }
  }
}

let bad = 0;
const noted = new Set();
for (const key of Object.keys(NOTES)) {
  let k;
  try {
    k = keysOf(key.split(" ")).at(-1);
  } catch {
    console.log(`illegal: ${key}`);
    bad++;
    continue;
  }
  noted.add(k);
  if (!onLines.has(k)) {
    console.log(`not on any line: ${key}`);
    bad++;
  }
}
const missing = branchKeys.filter(([, k]) => !noted.has(k));
for (const [label] of missing) console.log(`no note at branch: ${label}`);
// Ideas: diagram moves must be legal, chapters must exist.
const ideasFile = `src/lib/courses/${base}-ideas.ts`;
const { IDEAS } = existsSync(ideasFile) ? await import(`../${ideasFile}`) : { IDEAS: {} };
for (const [chapter, ideas] of Object.entries(IDEAS)) {
  if (!chapters[chapter]) {
    console.log(`ideas for unknown chapter: ${chapter}`);
    bad++;
  }
  for (const idea of ideas) {
    try {
      if (idea.moves) keysOf(idea.moves.split(" "));
    } catch {
      console.log(`illegal idea diagram: ${chapter}: ${idea.title}`);
      bad++;
    }
  }
}
console.log(`${Object.keys(NOTES).length} notes, ${bad} bad, ${missing.length} branch points without a note`);
process.exitCode = bad ? 1 : 0;
