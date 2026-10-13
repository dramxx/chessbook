"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { COURSES, moveLabel } from "@/lib/learn";
import { findTrap, recordTrap, TRAPS, trapTags } from "@/lib/traps";
import { playMoveSound } from "@/lib/sounds";

const LAST_MOVE = "rgba(255,255,51,.45)";
const WRONG = "rgba(230,60,50,.7)";
const SHOWN = "#5dab3a";
const SETUP_DELAY = 350; // the moves before the critical moment
const OPPONENT_DELAY = 700;

export default function TrapPage({ params }: { params: Promise<{ id: string }> }) {
  const trap = findTrap(use(params).id);
  const sans = trap ? trap.moves.split(" ") : [];
  const [ply, setPly] = useState(0); // moves played
  const [wrong, setWrong] = useState<{ fen: string; square: string } | null>(null);
  const [missed, setMissed] = useState(false); // the current move was missed: show it
  const [misses, setMisses] = useState(0);
  const recorded = useRef(false);

  const chess = new Chess();
  const steps = sans.map((san) => {
    const fen = chess.fen();
    const m = chess.move(san);
    return { san: m.san, from: m.from, to: m.to, fen };
  });
  const finalFen = chess.fen();
  const done = !!trap && ply === sans.length;
  const step = steps[ply];
  const mine = !!trap && !!step && ply >= trap.start && step.fen.split(" ")[1] === trap.side[0];

  // Setup moves and the opponent's replies play themselves.
  const autoFen = step && !mine ? step.fen : null;
  const autoSan = step?.san;
  const setup = !!trap && ply < trap.start;
  useEffect(() => {
    if (!autoFen || !autoSan) return;
    const t = window.setTimeout(() => {
      playMoveSound(new Chess(autoFen).move(autoSan));
      setPly((p) => p + 1);
    }, setup ? SETUP_DELAY : OPPONENT_DELAY);
    return () => clearTimeout(t);
  }, [autoFen, autoSan, setup]);

  useEffect(() => {
    if (!done || !trap || recorded.current) return;
    recorded.current = true;
    recordTrap(trap.id, misses === 0);
  }, [done, trap, misses]);

  if (!trap) return <p className="p-8">Trap not found.</p>;

  function onMove(from: string, to: string, promotion?: string) {
    if (!mine || wrong) return;
    const m = new Chess(step.fen).move({ from, to, promotion });
    playMoveSound(m);
    // Any mate counts, like in puzzles.
    if (m.san === step.san || (m.san.endsWith("#") && step.san.endsWith("#"))) {
      setMissed(false);
      setPly(ply + 1);
      return;
    }
    setMisses((n) => n + 1);
    setMissed(true);
    setWrong({ fen: m.after, square: to });
    window.setTimeout(() => setWrong(null), 700);
  }

  function restart() {
    recorded.current = false;
    setPly(0);
    setMisses(0);
    setMissed(false);
  }

  const fen = wrong?.fen ?? (step ? step.fen : finalFen);
  const last = steps[ply - 1];
  const highlights: Record<string, string> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {};
  if (wrong) highlights[wrong.square] = WRONG;
  const arrows: Arrow[] = mine && missed && !wrong ? [{ startSquare: step.from, endSquare: step.to, color: SHOWN }] : [];
  const index = TRAPS.indexOf(trap);
  const next = TRAPS[index + 1];
  const tags = trapTags(trap, COURSES);

  const panel = (
    <>
      <div>
        <p className="text-xs text-foreground/50">
          <Link href="/puzzles/traps" className="hover:underline">
            Opening traps
          </Link>{" "}
          › {trap.opening}
        </p>
        <h1 className="text-lg leading-tight font-bold">{trap.name}</h1>
        <p className="text-sm text-foreground/60">{trap.side === "white" ? "White" : "Black"} sets the trap: that&apos;s you.</p>
        {tags.length > 0 && (
          <p className="mt-1 text-xs text-foreground/60">
            {tags.map(({ course, kind }) => `${kind === "set" ? "Set it in" : "Watch out in"} ${course.title}`).join(" · ")}
          </p>
        )}
      </div>

      {ply > 0 && <MoveList moves={sans.slice(0, ply)} ply={ply} onSelect={() => {}} />}

      {setup && <p className="text-sm text-foreground/60">Setting up the position…</p>}
      {mine && (
        <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm">
          <p className="font-semibold">
            {missed ? (
              <>
                The move is <span className="font-mono">{moveLabel(step.fen)}{step.san}</span>: play it.
              </>
            ) : ply === trap.start ? (
              "Your move: spring the trap."
            ) : (
              "Your move: finish it."
            )}
          </p>
        </div>
      )}
      {done && (
        <>
          <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm">
            <p className="font-semibold">{misses === 0 ? "Trap sprung ✓" : `Trap sprung, with ${misses} miss${misses === 1 ? "" : "es"}`}</p>
            <p className="mt-1">{trap.text}</p>
          </div>
          <div className="rounded bg-surface/60 px-3 py-2 text-sm">
            <p className="font-semibold">From the other side</p>
            <p className="mt-1 text-foreground/80">{trap.avoid}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {next && (
              <Link href={`/puzzles/traps/${next.id}`} className="btn-primary">
                Next: {next.name}
              </Link>
            )}
            <button className="btn-secondary" onClick={restart}>
              Again
            </button>
            <Link href="/puzzles/traps" className="btn-secondary">
              All traps
            </Link>
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
          orientation={trap.side}
          canMove={mine && !wrong}
          onMove={onMove}
          highlights={highlights}
          arrows={arrows}
        />
      }
      panel={panel}
    />
  );
}
