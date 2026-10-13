// Stockfish for build scripts: the browser's wasm build (public/stockfish) also runs as a Node process.
import { spawn } from "node:child_process";

class Engine {
  constructor() {
    this.proc = spawn(process.execPath, ["public/stockfish/stockfish-19-lite-single.js"]);
    this.listener = () => {};
    let buffer = "";
    this.proc.stdout.on("data", (chunk) => {
      const lines = (buffer + chunk).split("\n");
      buffer = lines.pop();
      for (const line of lines) this.listener(line.trim());
    });
    this.ready = this.until(["uci"], "uciok");
  }

  until(cmds, prefix) {
    return new Promise((resolve) => {
      this.listener = (line) => line.startsWith(prefix) && resolve();
      for (const cmd of cmds) this.proc.stdin.write(cmd + "\n");
    });
  }

  // Lines ranked best first; cp is for the side to move, mates mapped to +-10000.
  // `searchmoves` (UCI) limits the search to those moves.
  async analyse(fen, depth, multipv, searchmoves = []) {
    await this.until([`setoption name MultiPV value ${multipv}`, "isready"], "readyok");
    const lines = new Map();
    await new Promise((resolve) => {
      this.listener = (line) => {
        if (line.startsWith("bestmove")) return resolve();
        const m = line.match(/ multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/);
        if (!m) return;
        const n = Number(m[3]);
        const cp = m[2] === "cp" ? n : n > 0 ? 10000 : -10000;
        lines.set(Number(m[1]), { cp, pv: m[4].split(" ") });
      };
      const limit = searchmoves.length ? ` searchmoves ${searchmoves.join(" ")}` : "";
      this.proc.stdin.write(`position fen ${fen}\ngo depth ${depth}${limit}\n`);
    });
    return [...lines.keys()].sort((a, b) => a - b).map((k) => lines.get(k));
  }

  quit() {
    this.proc.stdin.write("quit\n");
  }
}

// `size` engines; `analyse` runs on the next free one.
export function enginePool(size) {
  const engines = Array.from({ length: size }, () => new Engine());
  const idle = [...engines];
  const waiting = [];
  return {
    async analyse(...args) {
      const engine = idle.pop() ?? (await new Promise((r) => waiting.push(r)));
      await engine.ready;
      try {
        return await engine.analyse(...args);
      } finally {
        const next = waiting.shift();
        if (next) next(engine);
        else idle.push(engine);
      }
    },
    quit() {
      for (const e of engines) e.quit();
    },
  };
}
