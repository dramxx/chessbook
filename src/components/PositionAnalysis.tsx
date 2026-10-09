"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, validateFen } from "chess.js";
import { defaultPieces } from "react-chessboard";
import { Board, type Arrow } from "@/components/Board";
import { EvalBar } from "@/components/EvalBar";
import { GameLayout } from "@/components/GameLayout";
import { lineText } from "@/lib/analysis";
import { Engine, type Info } from "@/lib/engine";
import { playMoveSound } from "@/lib/sounds";

const START = new Chess().fen();
const BEST_ARROW = "rgba(129,182,76,.85)";
const LAST_MOVE = "rgba(255,255,51,.4)";
const LINES = 3;
const GO = "depth 24";

// Set up a position in the editor, then analyze it: Stockfish's top lines for whatever is on the
// board, while you play moves for both sides.
export function PositionAnalysis() {
  const [fen, setFen] = useState(START);
  const [editing, setEditing] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const orientation = flipped ? "black" : "white";
  const flip = () => setFlipped(!flipped);
  return editing ? (
    <PositionEditor
      initialFen={fen}
      orientation={orientation}
      onFlip={flip}
      onDone={(f) => {
        setFen(f);
        setEditing(false);
      }}
    />
  ) : (
    <LiveAnalysis
      startFen={fen}
      orientation={orientation}
      onFlip={flip}
      onEdit={(f) => {
        setFen(f);
        setEditing(true);
      }}
    />
  );
}

// 64 squares from a8 to h1, each a piece like "wK" or null.
type Grid = (string | null)[];

const FILES = "abcdefgh";
const index = (sq: string) => (8 - Number(sq[1])) * 8 + FILES.indexOf(sq[0]);

function parsePlacement(placement: string): Grid | null {
  const rows = placement.split("/");
  if (rows.length !== 8) return null;
  const grid: Grid = [];
  for (const row of rows) {
    let n = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        grid.push(...Array<null>(Number(ch)).fill(null));
        n += Number(ch);
      } else if (/[pnbrqk]/i.test(ch)) {
        grid.push(`${ch === ch.toUpperCase() ? "w" : "b"}${ch.toUpperCase()}`);
        n++;
      } else return null;
    }
    if (n !== 8) return null;
  }
  return grid;
}

function placement(grid: Grid) {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (const p of grid.slice(r * 8, r * 8 + 8)) {
      if (!p) empty++;
      else {
        row += (empty || "") + (p[0] === "w" ? p[1] : p[1].toLowerCase());
        empty = 0;
      }
    }
    rows.push(row + (empty || ""));
  }
  return rows.join("/");
}

// Castling rights wherever king and rook are still on their starting squares.
function castling(grid: Grid) {
  const at = (sq: string, p: string) => grid[index(sq)] === p;
  const rights =
    (at("e1", "wK") && at("h1", "wR") ? "K" : "") +
    (at("e1", "wK") && at("a1", "wR") ? "Q" : "") +
    (at("e8", "bK") && at("h8", "bR") ? "k" : "") +
    (at("e8", "bK") && at("a8", "bR") ? "q" : "");
  return rights || "-";
}

// Why the position can't be analyzed, or null if it can.
function problem(fen: string) {
  const v = validateFen(fen);
  if (!v.ok) return v.error!.replace("Invalid FEN: ", "").replace(/^./, (c) => c.toUpperCase()) + ".";
  const [board, turn, ...rest] = fen.split(" ");
  if (new Chess([board, turn === "w" ? "b" : "w", ...rest].join(" ")).isCheck()) return "The side not to move is in check.";
  return null;
}

const TOOLS = ["K", "Q", "R", "B", "N", "P"];

function PositionEditor({
  initialFen,
  orientation,
  onFlip,
  onDone,
}: {
  initialFen: string;
  orientation: "white" | "black";
  onFlip: () => void;
  onDone: (fen: string) => void;
}) {
  const [grid, setGrid] = useState(() => parsePlacement(initialFen.split(" ")[0])!);
  const [turn, setTurn] = useState(initialFen.split(" ")[1] === "b" ? "b" : "w");
  const [tool, setTool] = useState("wK"); // a piece, or "x" to erase
  const [draft, setDraft] = useState<string | null>(null); // FEN being typed
  const fen = `${placement(grid)} ${turn} ${castling(grid)} - 0 1`;
  const error = problem(fen);

  function load(f: string) {
    const [board, t] = f.trim().split(/\s+/);
    const g = board ? parsePlacement(board) : null;
    if (!g) return;
    setGrid(g);
    setTurn(t === "b" ? "b" : "w");
  }

  function click(sq: string) {
    const i = index(sq);
    const next = [...grid];
    if (tool === "x" || next[i] === tool) next[i] = null;
    else {
      // One king per side: placing a king moves it.
      if (tool[1] === "K") next.forEach((p, j) => p === tool && (next[j] = null));
      next[i] = tool;
    }
    setGrid(next);
  }

  const toolButton = (t: string, content: React.ReactNode, label: string) => (
    <button
      key={t}
      onClick={() => setTool(t)}
      aria-label={label}
      aria-pressed={tool === t}
      className={`flex size-10 items-center justify-center rounded ${tool === t ? "bg-accent" : "bg-surface hover:bg-surface-hover"}`}
    >
      {content}
    </button>
  );

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">Set up a position</h1>
        <p className="text-sm text-foreground/60">Pick a piece, then click squares to place it. Click it again to remove it.</p>
      </div>
      <div className="flex flex-col gap-1">
        {(["w", "b"] as const).map((c) => (
          <div key={c} className="flex gap-1">
            {TOOLS.map((p) => toolButton(`${c}${p}`, <span className="size-8">{defaultPieces[`${c}${p}`]()}</span>, `${c}${p}`))}
            {c === "w" && toolButton("x", <span className="text-lg">✕</span>, "Eraser")}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {(["w", "b"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setTurn(c)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${turn === c ? "bg-accent text-white" : "bg-surface hover:bg-surface-hover"}`}
          >
            {c === "w" ? "White" : "Black"} to move
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button className="btn-secondary" onClick={() => load(START)}>
          Start
        </button>
        <button className="btn-secondary" onClick={() => setGrid(Array<null>(64).fill(null))}>
          Clear
        </button>
        <button className="btn-secondary ml-auto" onClick={onFlip}>
          Flip
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs text-foreground/60">
        FEN
        <input
          value={draft ?? fen}
          onChange={(e) => {
            setDraft(e.target.value);
            load(e.target.value);
          }}
          onBlur={() => setDraft(null)}
          spellCheck={false}
          className="rounded bg-surface px-2 py-1.5 font-mono text-base text-foreground sm:text-xs"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary" disabled={error !== null} onClick={() => onDone(fen)}>
        Analyze
      </button>
    </>
  );

  return (
    <GameLayout
      board={<Board fen={fen} orientation={orientation} canMove={false} onMove={() => {}} onSquareClick={click} />}
      panel={panel}
    />
  );
}

// The side to move's score as White's, e.g. "+0.4" or "-M3".
function scoreText(info: Info, sign: number) {
  if (info.mate !== undefined) return `${info.mate * sign > 0 ? "+" : "-"}M${Math.abs(info.mate)}`;
  const cp = (info.cp ?? 0) * sign;
  return `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;
}

function LiveAnalysis({
  startFen,
  orientation,
  onFlip,
  onEdit,
}: {
  startFen: string;
  orientation: "white" | "black";
  onFlip: () => void;
  onEdit: (fen: string) => void;
}) {
  const [moves, setMoves] = useState<string[]>([]);
  const [ply, setPly] = useState(0);
  const [result, setResult] = useState<{ fen: string; lines: Info[] } | null>(null);
  const engine = useRef<Engine | null>(null);

  const positions = useMemo(() => {
    const chess = new Chess(startFen);
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null }];
    for (const san of moves) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, [startFen, moves]);

  const { fen, last } = positions[ply];
  const pos = useMemo(() => new Chess(fen), [fen]);
  const sign = pos.turn() === "w" ? 1 : -1;

  useEffect(() => {
    const e = new Engine();
    e.setOptions({ MultiPV: LINES });
    engine.current = e;
    return () => e.terminate();
  }, []);

  // Re-analyzes whenever the position changes; lines deepen as Stockfish reports them.
  useEffect(() => {
    if (!engine.current || new Chess(fen).isGameOver()) return;
    let live = true;
    let lines: Info[] = [];
    const search = engine.current.search(fen, GO, (info) => {
      if (!live) return;
      lines = [...lines];
      lines[info.multipv - 1] = info;
      setResult({ fen, lines });
    });
    return () => {
      live = false;
      search.stop();
    };
  }, [fen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPly((p) => Math.min(moves.length, p + 1));
      else if (e.key === "Home") setPly(0);
      else if (e.key === "End") setPly(moves.length);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  function play(from: string, to: string, promotion?: string) {
    let move;
    try {
      move = new Chess(fen).move({ from, to, promotion });
    } catch {
      return;
    }
    playMoveSound(move);
    if (moves[ply] !== move.san) setMoves([...moves.slice(0, ply), move.san]);
    setPly(ply + 1);
  }

  const lines = result?.fen === fen ? result.lines.filter(Boolean) : [];
  const top = lines[0];
  const over = pos.isCheckmate() ? (pos.turn() === "w" ? "0-1" : "1-0") : pos.isGameOver() ? "½-½" : null;

  const highlights: Record<string, string> = {};
  if (last) highlights[last.from] = highlights[last.to] = LAST_MOVE;
  const best = top?.pv[0];
  const arrows: Arrow[] = best ? [{ startSquare: best.slice(0, 2), endSquare: best.slice(2, 4), color: BEST_ARROW }] : [];

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">Analysis board</h1>
        <p className="text-sm text-foreground/60">
          {over
            ? pos.isCheckmate()
              ? "Checkmate."
              : pos.isStalemate()
                ? "Stalemate."
                : "Draw."
            : `Stockfish · depth ${top?.depth ?? "–"}. Play moves for either side on the board.`}
        </p>
      </div>

      {!over && (
        <div className="flex flex-col gap-1">
          {lines.map((info) => (
            <button
              key={info.multipv}
              onClick={() => play(info.pv[0].slice(0, 2), info.pv[0].slice(2, 4), info.pv[0][4])}
              title="Play the first move of this line"
              className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-surface"
            >
              <span className="w-14 shrink-0 rounded bg-surface px-1 text-center font-mono font-semibold">{scoreText(info, sign)}</span>
              <span className="truncate font-mono">{lineText(fen, info.pv.slice(0, 12))}</span>
            </button>
          ))}
          {lines.length === 0 && <p className="text-sm text-foreground/60">Stockfish is thinking…</p>}
        </div>
      )}

      <div className="flex gap-1">
        <button className="btn-secondary" disabled={ply === 0} onClick={() => setPly(0)} aria-label="Start">
          ⏮
        </button>
        <button className="btn-secondary" disabled={ply === 0} onClick={() => setPly(ply - 1)} aria-label="Back">
          ◀
        </button>
        <button className="btn-secondary" disabled={ply === moves.length} onClick={() => setPly(ply + 1)} aria-label="Forward">
          ▶
        </button>
        <button className="btn-secondary" disabled={ply === moves.length} onClick={() => setPly(moves.length)} aria-label="End">
          ⏭
        </button>
        <button className="btn-secondary ml-auto" onClick={onFlip}>
          Flip
        </button>
      </div>
      <button className="btn-secondary" onClick={() => onEdit(fen)}>
        Edit position
      </button>

      {moves.length > 0 && (
        <div className="flex flex-wrap gap-x-0.5 gap-y-1 font-mono text-sm">
          {moves.map((san, i) => {
            const [, turn, , , , n] = positions[i].fen.split(" ");
            return (
              <span key={i} className="flex items-center">
                {(turn === "w" || i === 0) && (
                  <span className="mr-1 ml-1.5 text-foreground/50">
                    {n}.{turn === "b" && ".."}
                  </span>
                )}
                <button
                  onClick={() => setPly(i + 1)}
                  className={`rounded px-1.5 py-0.5 ${i + 1 === ply ? "bg-accent text-white" : "hover:bg-surface-hover"}`}
                >
                  {san}
                </button>
              </span>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <GameLayout
      boardSide={
        <EvalBar
          cp={over ? 0 : top ? (top.cp ?? 0) * sign : undefined}
          mate={over === "1-0" ? 1 : over === "0-1" ? -1 : top?.mate !== undefined ? top.mate * sign : undefined}
          text={over ?? undefined}
          orientation={orientation}
        />
      }
      board={
        <Board fen={fen} orientation={orientation} canMove={!over} moveBothSides onMove={play} highlights={highlights} arrows={arrows} />
      }
      panel={panel}
    />
  );
}
