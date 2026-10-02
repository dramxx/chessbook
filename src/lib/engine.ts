// Stockfish 19 lite (single-threaded WASM, public/stockfish/, GPLv3) in a Web Worker.
// Commands are queued, so one search runs at a time per engine; `stop` ends the running one.

// Score for the side to move. `multipv` is the line's rank (1 = best), above 1 only with the MultiPV option.
export type Info = { depth: number; multipv: number; cp?: number; mate?: number; pv: string[] };

type Job = (send: (cmd: string) => void, onLine: (fn: (line: string) => void) => void) => Promise<void>;

export class Engine {
  private worker = new Worker("/stockfish/stockfish-19-lite-single.js");
  private listener: (line: string) => void = () => {};
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    this.worker.onmessage = (e) => this.listener(String(e.data));
    this.run((send, onLine) => untilLine(send, onLine, ["uci"], "uciok"));
  }

  private run(job: Job): Promise<void> {
    const send = (cmd: string) => this.worker.postMessage(cmd);
    const onLine = (fn: (line: string) => void) => (this.listener = fn);
    this.queue = this.queue.then(() => job(send, onLine)).catch(() => {});
    return this.queue;
  }

  setOptions(options: Record<string, string | number | boolean>) {
    const cmds = Object.entries(options).map(([k, v]) => `setoption name ${k} value ${v}`);
    return this.run((send, onLine) => untilLine(send, onLine, [...cmds, "isready"], "readyok"));
  }

  // Searches `fen` with a UCI `go` argument ("movetime 500", "depth 18"). Resolves with the best
  // move in UCI, or null if stopped before it started.
  search(fen: string, go: string, onInfo?: (info: Info) => void) {
    let stopped = false;
    let running = false;
    let send: (cmd: string) => void = () => {};
    let best: string | null = null;
    const result = this.run(async (s, onLine) => {
      if (stopped) return;
      running = true;
      send = s;
      await new Promise<void>((resolve) => {
        onLine((line) => {
          if (line.startsWith("bestmove")) {
            best = line.split(" ")[1] ?? null;
            resolve();
          } else if (onInfo && line.startsWith("info") && line.includes(" pv ")) {
            const info = parseInfo(line);
            if (info) onInfo(info);
          }
        });
        send(`position fen ${fen}`);
        send(`go ${go}`);
      });
    }).then(() => (best === "(none)" ? null : best));
    return {
      result,
      stop: () => {
        stopped = true;
        if (running) send("stop");
      },
    };
  }

  terminate() {
    this.worker.terminate();
  }
}

function untilLine(
  send: (cmd: string) => void,
  onLine: (fn: (line: string) => void) => void,
  cmds: string[],
  until: string,
) {
  return new Promise<void>((resolve) => {
    onLine((line) => line.startsWith(until) && resolve());
    cmds.forEach(send);
  });
}

function parseInfo(line: string): Info | null {
  const t = line.split(" ");
  const at = (k: string) => t.indexOf(k);
  const score = at("score");
  if (score < 0) return null;
  const kind = t[score + 1];
  const value = Number(t[score + 2]);
  return {
    depth: Number(t[at("depth") + 1]),
    multipv: at("multipv") >= 0 ? Number(t[at("multipv") + 1]) : 1,
    cp: kind === "cp" ? value : undefined,
    mate: kind === "mate" ? value : undefined,
    pv: t.slice(at("pv") + 1),
  };
}

// How the bot plays at a given rating (400–3200, steps of 100). Approximate: Stockfish's UCI_Elo
// is calibrated against engines, not human rating pools.
export function botLevel(rating: number): {
  options: Record<string, string | number | boolean>;
  go: string;
  randomMove: number; // chance to play a random legal move instead
} {
  if (rating >= 3200) return { options: { UCI_LimitStrength: false, "Skill Level": 20 }, go: "movetime 1000", randomMove: 0 };
  if (rating >= 1400) return { options: { UCI_LimitStrength: true, UCI_Elo: rating }, go: "movetime 700", randomMove: 0 };
  // Below Stockfish's 1320 minimum: weakest skill, shallow search, plus random moves.
  return {
    options: { UCI_LimitStrength: false, "Skill Level": 0 },
    go: `depth ${1 + Math.round((rating - 400) / 300)}`,
    randomMove: ((1400 - rating) / 1000) * 0.5,
  };
}
