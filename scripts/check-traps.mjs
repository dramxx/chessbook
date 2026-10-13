// Checks the opening traps (src/lib/traps-data.ts): every line must be legal, the trapper must be to
// move at `start`, and the final position must be mate or clearly winning for the trapper (Stockfish).
// Usage: node --experimental-strip-types scripts/check-traps.mjs
import { Chess } from "chess.js";
import { enginePool } from "./stockfish.mjs";

const MIN_EDGE = 300; // centipawns the trapper must be up at the end

const { TRAPS } = await import("../src/lib/traps-data.ts");
const engines = enginePool(4);
let bad = 0;

await Promise.all(
  TRAPS.map(async (trap) => {
    const chess = new Chess();
    const sans = trap.moves.split(" ");
    try {
      sans.forEach((san, i) => {
        if (i === trap.start && chess.turn() !== trap.side[0]) throw new Error(`the trapper is not to move at ply ${i}`);
        chess.move(san);
      });
    } catch (e) {
      console.log(`${trap.id}: ${e.message}`);
      bad++;
      return;
    }
    if (trap.start >= sans.length) {
      console.log(`${trap.id}: start is past the end of the line`);
      bad++;
      return;
    }
    let edge;
    if (chess.isCheckmate()) edge = chess.turn() === trap.side[0] ? -10000 : 10000;
    else {
      const [line] = await engines.analyse(chess.fen(), 18, 1);
      edge = chess.turn() === trap.side[0] ? line.cp : -line.cp;
    }
    const ok = edge >= MIN_EDGE;
    if (!ok) bad++;
    console.log(`${ok ? "ok " : "BAD"} ${trap.id.padEnd(20)} ${edge >= 9000 ? "mate" : (edge / 100).toFixed(1)}`);
  }),
);
engines.quit();
console.log(`${TRAPS.length} traps, ${bad} bad`);
process.exitCode = bad ? 1 : 0;
