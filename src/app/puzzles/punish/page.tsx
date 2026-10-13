"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { Engine, type Info } from "@/lib/engine";
import { COURSES, moveLabel } from "@/lib/learn";
import { epd, loadOpenings, type OpeningDb } from "@/lib/openings";
import {
  beforeMistake,
  grade,
  loadPunish,
  loadStats,
  recordResult,
  type PunishPuzzle,
  type PunishStats,
  type Verdict,
} from "@/lib/punish";
import { playMoveSound } from "@/lib/sounds";

const LAST_MOVE = "rgba(255,255,51,.45)";
const MISTAKE = "rgba(230,60,50,.45)";
const BEST = "#5dab3a";
const SHOWN_DELAY = 800; // before the mistake is played
const LINE_STEP = 900;

type Filter = "all" | string; // or a course id
type Result = { verdict: Verdict; san: string; cp: number; fen: string; from: string; to: string };

const pawns = (cp: number) => (Math.abs(cp) >= 9000 ? (cp > 0 ? "mate" : "-mate") : `${cp > 0 ? "+" : ""}${(cp / 100).toFixed(1)}`);

function pick(list: PunishPuzzle[], stats: PunishStats | null, not?: string) {
  const solved = new Set(stats?.solved ?? []);
  const fresh = list.filter((p) => !solved.has(p.id) && p.id !== not);
  const pool = fresh.length ? fresh : list.filter((p) => p.id !== not);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

export default function PunishPage() {
  const [all, setAll] = useState<PunishPuzzle[] | null>(null);
  const [book, setBook] = useState<OpeningDb | null>(null);
  const [stats, setStats] = useState<PunishStats | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [puzzle, setPuzzle] = useState<PunishPuzzle | null>(null);
  const [shown, setShown] = useState(false); // the mistake has been played on the board
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [lineStep, setLineStep] = useState<number | null>(null); // plies of the best line shown
  const engine = useRef<Engine | null>(null);

  useEffect(() => {
    loadPunish().then(setAll);
    loadOpenings().then(setBook);
    setStats(loadStats()); // eslint-disable-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    return () => engine.current?.terminate();
  }, []);

  const list = useMemo(() => {
    if (!all) return [];
    if (filter === "all") return all;
    return all.filter((p) => p.courses.includes(filter));
  }, [all, filter]);

  // A new puzzle when the list changes (first load or a new filter). A ?id= link (from the traps
  // page) opens that puzzle first.
  const linked = useRef<string | null>(null);
  useEffect(() => {
    if (!all) return;
    linked.current ??= new URLSearchParams(window.location.search).get("id") ?? "";
    const wanted = linked.current && all.find((p) => p.id === linked.current);
    linked.current = "";
    start(wanted || pick(list, loadStats()));
  }, [all, list]);

  function start(p: PunishPuzzle | null) {
    setPuzzle(p);
    setShown(false);
    setResult(null);
    setChecking(false);
    setLineStep(null);
  }

  // Show the position, then the opponent's mistake.
  useEffect(() => {
    if (!puzzle || shown) return;
    const t = window.setTimeout(() => {
      playMoveSound(new Chess(beforeMistake(puzzle)).move(puzzle.moves.at(-1)!));
      setShown(true);
    }, SHOWN_DELAY);
    return () => clearTimeout(t);
  }, [puzzle, shown]);

  // Step through the best line.
  useEffect(() => {
    if (!puzzle || lineStep === null || lineStep >= puzzle.pv.length) return;
    const t = window.setTimeout(() => setLineStep((s) => (s ?? 0) + 1), LINE_STEP);
    return () => clearTimeout(t);
  }, [puzzle, lineStep]);

  const opening = useMemo(() => {
    if (!puzzle || !book) return puzzle?.opening ?? null;
    const chess = new Chess();
    let name: string | null = null;
    for (const san of puzzle.moves.slice(0, -1)) {
      chess.move(san);
      name = book[epd(chess.fen())]?.name ?? name;
    }
    return name ?? puzzle.opening;
  }, [puzzle, book]);

  if (!all) return <p className="p-8 text-neutral-400">Loading…</p>;

  const before = puzzle ? beforeMistake(puzzle) : new Chess().fen();
  const mistake = puzzle ? new Chess(before).move(puzzle.moves.at(-1)!) : null;
  const side = puzzle && puzzle.fen.split(" ")[1] === "w" ? "white" : "black";
  const best = puzzle?.replies[0];

  // Board: before the mistake, after it, after our answer, or along the best line.
  let fen = puzzle ? (shown ? puzzle.fen : before) : before;
  let last: { from: string; to: string; color: string } | null = shown && mistake ? { ...mistake, color: MISTAKE } : null;
  if (result) {
    fen = result.fen;
    last = { from: result.from, to: result.to, color: LAST_MOVE };
  }
  if (puzzle && lineStep !== null) {
    const chess = new Chess(puzzle.fen);
    let m = null;
    for (const uci of puzzle.pv.slice(0, lineStep)) m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    fen = chess.fen();
    last = m ? { from: m.from, to: m.to, color: LAST_MOVE } : null;
  }
  const highlights: Record<string, string> = last ? { [last.from]: last.color, [last.to]: last.color } : {};
  const arrows: Arrow[] =
    result && best && result.verdict !== "best" && lineStep === null
      ? [{ startSquare: best.uci.slice(0, 2), endSquare: best.uci.slice(2, 4), color: BEST }]
      : [];

  function finish(san: string, cp: number, after: string, from: string, to: string) {
    if (!puzzle || !best) return;
    const verdict = grade(best.cp, cp, san === best.san);
    setResult({ verdict, san, cp, fen: after, from, to });
    setChecking(false);
    recordResult(puzzle.id, verdict === "best" || verdict === "good");
    setStats(loadStats());
  }

  function onMove(from: string, to: string, promotion?: string) {
    if (!puzzle || !shown || result || checking) return;
    const m = new Chess(puzzle.fen).move({ from, to, promotion });
    playMoveSound(m);
    const known = puzzle.replies.find((r) => r.san === m.san);
    if (known) return finish(m.san, known.cp, m.after, m.from, m.to);
    // Not among the stored replies: ask Stockfish about the position after it.
    setChecking(true);
    setResult(null);
    engine.current ??= new Engine();
    let info: Info | null = null;
    engine.current.search(m.after, "depth 14", (i) => (info = i)).result.then(() => {
      const i = info as Info | null;
      const cp = i?.mate !== undefined ? (i.mate > 0 ? -10000 : 10000) : -(i?.cp ?? 0);
      finish(m.san, cp, m.after, m.from, m.to);
    });
  }

  const solved = list.filter((p) => stats?.solved.includes(p.id)).length;
  const label = puzzle && mistake ? `${moveLabel(before)}${mistake.san}` : "";
  const courseOptions = COURSES.filter((c) => all.some((p) => p.courses.includes(c.id)));

  const panel = (
    <>
      <div>
        <h1 className="text-lg leading-tight font-bold">Punish it</h1>
        <p className="text-sm text-foreground/60">Club players make this mistake all the time. Make them pay.</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded bg-surface px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">All openings</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="text-foreground/60">
          {solved}/{list.length} solved
        </span>
      </div>

      {!puzzle ? (
        <p className="text-sm text-foreground/60">No positions for this filter yet.</p>
      ) : (
        <>
          <div className="text-sm" data-puzzle={puzzle.id}>
            {opening && <p className="font-semibold">{opening}</p>}
            <p className="mt-1 text-foreground/70">
              {shown ? (
                <>
                  <span className="font-mono font-semibold text-red-400">{label}</span> is played in{" "}
                  {puzzle.games.toLocaleString()} club games
                  {puzzle.score !== undefined && <> (that side scores {puzzle.score}%)</>},{" "}
                  {puzzle.drop >= 5000 ? "and it allows mate." : `and it loses about ${(puzzle.drop / 100).toFixed(1)} pawns.`}
                </>
              ) : (
                "Watch the opponent's move…"
              )}
            </p>
          </div>

          {shown && !result && (
            <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-semibold">
              {checking ? "Checking your move…" : `${side === "white" ? "White" : "Black"} to move: punish it.`}
            </div>
          )}

          {result && best && (
            <div
              className={`rounded border px-3 py-2 text-sm ${
                result.verdict === "miss" ? "border-red-400/60 bg-red-400/10" : "border-accent/60 bg-accent/10"
              }`}
            >
              <p className="font-semibold">
                {result.verdict === "best" && <>Best move: {result.san}!</>}
                {result.verdict === "good" && <>Good: {result.san} keeps a clear edge.</>}
                {result.verdict === "playable" && <>Playable, but {best.san} was much stronger.</>}
                {result.verdict === "miss" && <>Not quite: after {result.san} the advantage is gone.</>}
              </p>
              <p className="mt-1 text-foreground/70">
                Your move: {pawns(result.cp)} · best: {best.san} {pawns(best.cp)}
              </p>
            </div>
          )}

          {result && (
            <div className="text-sm">
              <p className="font-semibold">Engine&apos;s top replies</p>
              <ul className="mt-1 grid gap-0.5 font-mono">
                {puzzle.replies.map((r) => (
                  <li key={r.uci} className="flex justify-between">
                    <span>{r.san}</span>
                    <span className="text-foreground/60">{pawns(r.cp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {result ? (
              <>
                <button className="btn-primary" onClick={() => start(pick(list, stats, puzzle.id))}>
                  Next
                </button>
                <button className="btn-secondary" onClick={() => start(puzzle)}>
                  Retry
                </button>
                {puzzle.pv.length > 0 && (
                  <button className="btn-secondary" onClick={() => setLineStep(0)}>
                    Show best line
                  </button>
                )}
                <Link
                  href={`/stockfish?moves=${encodeURIComponent(puzzle.moves.join(" "))}&color=${side}`}
                  className="btn-secondary"
                >
                  Play it out vs Stockfish
                </Link>
              </>
            ) : (
              <button className="btn-secondary" disabled={!shown || checking} onClick={() => start(pick(list, stats, puzzle.id))}>
                Skip
              </button>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <GameLayout
      scrollPanel
      board={
        <Board
          fen={fen}
          orientation={side}
          canMove={!!puzzle && shown && !result && !checking}
          onMove={onMove}
          highlights={highlights}
          arrows={arrows}
        />
      }
      panel={panel}
    />
  );
}
