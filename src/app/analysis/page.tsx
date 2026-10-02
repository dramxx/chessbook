"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { EvalBar } from "@/components/EvalBar";
import { GameLayout } from "@/components/GameLayout";
import { PositionAnalysis } from "@/components/PositionAnalysis";
import {
  analysisHref,
  analyze,
  cachedEvals,
  cacheEvals,
  LABELS,
  lineText,
  review,
  summarize,
  type AnalysisTarget,
  type Label,
  type PositionEval,
} from "@/lib/analysis";
import { Engine } from "@/lib/engine";
import { listGames, type SavedGame } from "@/lib/history";
import { loadOpenings, type OpeningDb } from "@/lib/openings";

const BEST_ARROW = "rgba(129,182,76,.85)";

// /analysis lists your finished games; /analysis?moves=…&white=…&black=…&result=… reviews one;
// /analysis?board sets up and analyzes any position.
export default function AnalysisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = use(searchParams);
  const str = (k: string) => (typeof sp[k] === "string" ? sp[k] : "");
  const movesParam = str("moves");
  const target = useMemo((): AnalysisTarget | null => {
    const moves = movesParam.split(" ").filter(Boolean);
    try {
      const chess = new Chess();
      for (const san of moves) chess.move(san);
    } catch {
      return null;
    }
    const you = str("you");
    return {
      moves,
      white: str("white") || "White",
      black: str("black") || "Black",
      result: str("result") || "*",
      you: you === "white" || you === "black" ? you : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `str` reads the same params
  }, [movesParam, sp]);

  if ("board" in sp) return <PositionAnalysis />;
  if (!movesParam) return <MyGames />;
  if (!target || target.moves.length === 0) return <p className="p-8">This game can&apos;t be analyzed: its moves are invalid.</p>;
  return <Review key={movesParam} target={target} />;
}

function MyGames() {
  const [games, setGames] = useState<SavedGame[] | null>(null);
  useEffect(() => {
    setGames(listGames()); // eslint-disable-line react-hooks/set-state-in-effect -- reading browser storage after hydration
  }, []);
  if (!games) return null;

  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Link href="/analysis?board" className="btn-secondary self-start">
        Analyze a position
      </Link>
      <div>
        <h1 className="text-xl font-bold">My games</h1>
        <p className="text-sm text-foreground/60">
          Your finished games against Stockfish and friends, saved in this browser. Pick one for a move-by-move review. Games
          from the database have an Analyze button on their replay page.
        </p>
      </div>
      {games.length === 0 ? (
        <p className="text-sm text-foreground/60">No games yet. Finish a game on the Stockfish or Play page and it shows up here.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {games.map((g) => {
            const won = g.result === (g.you === "white" ? "1-0" : "0-1");
            const lost = g.result === (g.you === "white" ? "0-1" : "1-0");
            return (
              <li key={g.id}>
                <Link
                  href={analysisHref(g)}
                  className="flex items-center gap-3 rounded bg-panel px-3 py-2 text-sm hover:bg-surface-hover"
                >
                  <span
                    className={`w-10 shrink-0 text-center font-mono font-bold ${won ? "text-accent" : lost ? "text-red-400" : "text-foreground/60"}`}
                  >
                    {won ? "Won" : lost ? "Lost" : "Draw"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {g.white} – {g.black}
                    </span>
                    <span className="block truncate text-foreground/60">
                      {g.text} · {Math.ceil(g.moves.length / 2)} moves
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-foreground/50">{date.format(g.date)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function scoreText(e?: PositionEval) {
  if (!e) return "";
  if (e.mate === 0) return e.win === 100 ? "1-0" : "0-1";
  if (e.mate !== undefined) return `${e.mate > 0 ? "+" : "-"}M${Math.abs(e.mate)}`;
  const cp = e.cp ?? 0;
  return `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;
}

function Review({ target }: { target: AnalysisTarget }) {
  const { moves, white, black, result, you } = target;
  const [evals, setEvals] = useState<(PositionEval | undefined)[]>([]);
  const [book, setBook] = useState<OpeningDb | null>(null);
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(you === "black");

  const done = evals.filter(Boolean).length === moves.length + 1;

  useEffect(() => {
    loadOpenings().then(setBook);
  }, []);

  // Runs Stockfish over the whole game unless the cache already has it.
  useEffect(() => {
    const cached = cachedEvals(moves);
    if (cached) {
      setEvals(cached); // eslint-disable-line react-hooks/set-state-in-effect -- reading browser storage after hydration
      return;
    }
    const engine = new Engine();
    const stop = analyze(engine, moves, (i, e) =>
      setEvals((prev) => {
        const next = [...prev];
        next[i] = e;
        return next;
      }),
    );
    return () => {
      stop();
      engine.terminate();
    };
  }, [moves]);

  useEffect(() => {
    if (done) cacheEvals(moves, evals as PositionEval[]);
  }, [done, moves, evals]);

  const reviews = useMemo(() => (book ? review(moves, evals, book) : moves.map(() => null)), [moves, evals, book]);
  const sides = useMemo(
    () => ({ white: summarize(reviews, "white"), black: summarize(reviews, "black") }),
    [reviews],
  );

  const positions = useMemo(() => {
    const chess = new Chess();
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null }];
    for (const san of moves) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, [moves]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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

  const { fen, last } = positions[ply];
  const current = ply > 0 ? reviews[ply - 1] : null;
  const shown = evals[ply];

  const highlights: Record<string, string> = {};
  if (last) highlights[last.from] = highlights[last.to] = current ? `${LABELS[current.label].color}99` : "rgba(255,255,51,.4)";
  // The move that should have been played instead of the one on the board.
  const bestUci = ply > 0 && current?.bestSan ? evals[ply - 1]?.best : undefined;
  const arrows: Arrow[] = bestUci ? [{ startSquare: bestUci.slice(0, 2), endSquare: bestUci.slice(2, 4), color: BEST_ARROW }] : [];

  const badge = last && current ? { square: last.to, ...LABELS[current.label], title: LABELS[current.label].name } : undefined;

  const orientation = flipped ? "black" : "white";
  const analyzed = evals.filter(Boolean).length;

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">
          {white} – {black}
        </h1>
        <p className="text-sm text-foreground/60">{result.replace("1/2-1/2", "½-½")} · Game review</p>
      </div>

      {!done && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-foreground/60">
            <span>Stockfish is analyzing…</span>
            <span>
              {analyzed}/{moves.length + 1}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${(analyzed / (moves.length + 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <Summary white={white} black={black} sides={sides} />

      <EvalGraph evals={evals} reviews={reviews} ply={ply} total={moves.length} onSelect={setPly} />

      <div className="min-h-10 text-sm">
        {ply === 0 ? (
          <span className="text-foreground/60">Starting position. Use ◀ ▶ or the arrow keys to step through the game.</span>
        ) : (
          <>
            <span className="font-mono font-semibold">
              {Math.ceil(ply / 2)}.{ply % 2 === 0 && ".."} {moves[ply - 1]}
            </span>{" "}
            {current ? (
              <>
                is <b style={{ color: LABELS[current.label].color }}>{LABELS[current.label].name.toLowerCase()}</b>
                {current.bestSan && (
                  <>
                    . Best was <span className="font-mono font-semibold">{current.bestSan}</span>
                  </>
                )}
              </>
            ) : (
              <span className="text-foreground/60">being analyzed…</span>
            )}
            {shown && <span className="ml-1 font-mono text-foreground/60">({scoreText(shown)})</span>}
          </>
        )}
      </div>

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
        <button className="btn-secondary ml-auto" onClick={() => setFlipped(!flipped)}>
          Flip
        </button>
      </div>

      <ReviewMoves moves={moves} reviews={reviews} evals={evals} fens={positions.map((p) => p.fen)} ply={ply} onSelect={setPly} />
    </>
  );

  const mateOnBoard = shown?.mate === 0;
  return (
    <GameLayout
      boardSide={
        <EvalBar
          cp={mateOnBoard ? undefined : shown?.cp}
          mate={mateOnBoard ? (shown.win === 100 ? 1 : -1) : shown?.mate}
          text={mateOnBoard ? scoreText(shown) : undefined}
          orientation={orientation}
        />
      }
      board={<Board fen={fen} orientation={orientation} canMove={false} onMove={() => {}} highlights={highlights} arrows={arrows} badge={badge} />}
      panel={panel}
    />
  );
}

function Badge({ label }: { label: Label }) {
  const { symbol, color, name } = LABELS[label];
  return (
    <span
      title={name}
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] leading-none font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {symbol}
    </span>
  );
}

type Side = ReturnType<typeof summarize>;

function Summary({ white, black, sides }: { white: string; black: string; sides: { white: Side; black: Side } }) {
  const cell = "px-2 py-0.5 text-center font-mono";
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-foreground/60">
          <th />
          <th className="max-w-20 truncate px-2 font-semibold">{white}</th>
          <th className="max-w-20 truncate px-2 font-semibold">{black}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="py-0.5">Accuracy</td>
          {[sides.white, sides.black].map((s, i) => (
            <td key={i} className={`${cell} text-base font-bold`}>
              {s.accuracy === null ? "–" : s.accuracy.toFixed(1)}
            </td>
          ))}
        </tr>
        <tr title="A rough estimate from this game's accuracy">
          <td className="py-0.5">Played like</td>
          {[sides.white, sides.black].map((s, i) => (
            <td key={i} className={cell}>
              {s.rating === null ? "–" : `≈${s.rating}`}
            </td>
          ))}
        </tr>
        {(Object.keys(LABELS) as Label[]).map((label) => (
          <tr key={label}>
            <td className="py-0.5">
              <span className="flex items-center gap-2">
                <Badge label={label} />
                {LABELS[label].name}
              </span>
            </td>
            {[sides.white, sides.black].map((s, i) => (
              <td key={i} className={cell} style={{ color: s.counts[label] ? LABELS[label].color : undefined }}>
                {s.counts[label] || <span className="text-foreground/30">0</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// White's winning chances across the game; click to jump to a move. Notable moves get a dot.
function EvalGraph({
  evals,
  reviews,
  ply,
  total,
  onSelect,
}: {
  evals: (PositionEval | undefined)[];
  reviews: ReturnType<typeof review>;
  ply: number;
  total: number;
  onSelect: (ply: number) => void;
}) {
  const x = (i: number) => (total ? (i / total) * 100 : 0);
  const known: [number, number][] = [];
  for (let i = 0; i <= total && evals[i]; i++) known.push([x(i), 100 - evals[i]!.win]);
  const area = known.length > 1 ? `M0,100 ${known.map(([px, py]) => `L${px},${py}`).join(" ")} L${known.at(-1)![0]},100 Z` : "";
  const notable: Label[] = ["brilliant", "great", "miss", "mistake", "blunder"];

  return (
    <div
      className="relative h-16 cursor-pointer overflow-hidden rounded bg-neutral-800"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSelect(Math.round(((e.clientX - r.left) / r.width) * total));
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d={area} fill="#e5e5e5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#737373" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={x(ply)} y1="0" x2={x(ply)} y2="100" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      {reviews.map((r, i) =>
        r && notable.includes(r.label) && evals[i + 1] ? (
          <span
            key={i}
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/40"
            style={{ left: `${x(i + 1)}%`, top: `${100 - evals[i + 1]!.win}%`, backgroundColor: LABELS[r.label].color }}
          />
        ) : null,
      )}
    </div>
  );
}

function ReviewMoves({
  moves,
  reviews,
  evals,
  fens,
  ply,
  onSelect,
}: {
  moves: string[];
  reviews: ReturnType<typeof review>;
  evals: (PositionEval | undefined)[];
  fens: string[];
  ply: number;
  onSelect: (ply: number) => void;
}) {
  // Hovered move and where to show its popup (fixed, so the scrolling panel doesn't clip it).
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Keeps the current move in view. Scrolls only the move box, which scrolls only in landscape.
  useEffect(() => {
    const el = box.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    const current = el.querySelector("[data-current]");
    if (!current) return void (el.scrollTop = 0);
    const b = el.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    if (c.top < b.top) el.scrollTop += c.top - b.top;
    else if (c.bottom > b.bottom) el.scrollTop += c.bottom - b.bottom;
  }, [ply]);
  const move = (i: number) => (
    <button
      onClick={() => onSelect(i + 1)}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover({ i, left: Math.min(r.left, window.innerWidth - 296), top: r.bottom + 4 });
      }}
      onMouseLeave={() => setHover(null)}
      data-current={i + 1 === ply || undefined}
      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left ${i + 1 === ply ? "bg-surface-hover" : "hover:bg-surface"}`}
    >
      {reviews[i] && <Badge label={reviews[i]!.label} />}
      {moves[i]}
    </button>
  );
  const before = hover && evals[hover.i];
  const hovered = hover && reviews[hover.i];
  return (
    // In landscape only the moves scroll; the panel itself scrolls only if the screen is too short for the rest.
    <div ref={box} className="landscape:min-h-32 landscape:flex-1 landscape:overflow-y-auto">
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 font-mono text-sm">
        {Array.from({ length: Math.ceil(moves.length / 2) }, (_, r) => (
          <div key={r} className="contents">
            <span className="self-center pr-1 text-right text-foreground/50">{r + 1}.</span>
            {move(2 * r)}
            {2 * r + 1 < moves.length ? move(2 * r + 1) : <span />}
          </div>
        ))}
        {hover && before?.best && (
          <div
            className="pointer-events-none fixed z-50 w-72 rounded bg-panel p-2 font-sans text-sm shadow-lg ring-1 ring-black/40"
            style={{ left: hover.left, top: hover.top }}
          >
            {hovered && (
              <div className="mb-1 flex items-center gap-1.5">
                <Badge label={hovered.label} />
                <span className="font-mono font-semibold">{moves[hover.i]}</span>
                <span style={{ color: LABELS[hovered.label].color }}>{LABELS[hovered.label].name.toLowerCase()}</span>
              </div>
            )}
            <div className="text-xs text-foreground/60">
              Best line <span className="font-mono">({scoreText(before)})</span>
            </div>
            <div className="font-mono">{lineText(fens[hover.i], before.pv ?? [before.best])}</div>
          </div>
        )}
      </div>
    </div>
  );
}
