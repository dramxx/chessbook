"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import {
  findCourse,
  formatWait,
  isMine,
  loadProgress,
  moveLabel,
  nextDue,
  recordReview,
  reviewQueue,
  type ReviewLine,
} from "@/lib/learn";
import { playMoveSound } from "@/lib/sounds";

const LAST_MOVE = "rgba(255,255,51,.45)";
const WRONG = "rgba(230,60,50,.7)";
const SHOWN = "#5dab3a";
const OPPONENT_DELAY = 500;
const OWN_DELAY = 250; // own moves that aren't due play themselves, quicker
const LINE_PAUSE = 900;

export default function ReviewPage({ params }: { params: Promise<{ course: string }> }) {
  const course = findCourse(use(params).course);
  const [queue, setQueue] = useState<ReviewLine[] | null>(null);
  const [li, setLi] = useState(0); // line index
  const [ply, setPly] = useState(0); // moves played in the line
  const [failed, setFailed] = useState(false); // the current quiz move was missed: show it
  const [wrong, setWrong] = useState<{ fen: string; square: string } | null>(null);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [nextIn, setNextIn] = useState<string | null>(null); // wait until the next review, set when the session ends

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    if (course) setQueue(reviewQueue(course, loadProgress(), Date.now()));
  }, [course]);

  const line = queue?.[li];
  const steps = line?.steps ?? [];
  const step = steps[ply];
  const quizzing = !!line && line.quiz.includes(ply);
  const lineDone = !!line && ply > line.quiz.at(-1)!;
  const finished = !!queue && li >= queue.length;
  const total = queue?.reduce((n, l) => n + l.quiz.length, 0) ?? 0;

  // Opponent's moves and own moves that aren't due play themselves, up to the line's last quiz move.
  const autoFen = step && !quizzing && !lineDone ? step.fen : null;
  const autoSan = step?.san;
  const own = !!course && !!step && isMine(step, course.side);
  useEffect(() => {
    if (!autoFen || !autoSan) return;
    const t = window.setTimeout(() => {
      playMoveSound(new Chess(autoFen).move(autoSan));
      setPly((p) => p + 1);
    }, own ? OWN_DELAY : OPPONENT_DELAY);
    return () => clearTimeout(t);
  }, [autoFen, autoSan, own]);

  // After a line's last quiz move, go on to the next line.
  useEffect(() => {
    if (!lineDone) return;
    const t = window.setTimeout(() => {
      setLi((i) => i + 1);
      setPly(0);
    }, LINE_PAUSE);
    return () => clearTimeout(t);
  }, [lineDone]);

  useEffect(() => {
    if (!finished || !course) return;
    const due = nextDue(course, loadProgress());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage once the session ends
    setNextIn(due === null ? null : formatWait(due, Date.now()));
  }, [finished, course]);

  if (!course) return <p className="p-8">Course not found.</p>;
  if (!queue) return <p className="p-8 text-neutral-400">Loading…</p>;

  const fen = step ? step.fen : steps.length ? new Chess(steps.at(-1)!.fen).move(steps.at(-1)!.san).after : new Chess().fen();

  function onMove(from: string, to: string, promotion?: string) {
    if (!course || !quizzing || wrong) return;
    const m = new Chess(step.fen).move({ from, to, promotion });
    playMoveSound(m);
    if (m.san === step.san) {
      if (!failed) {
        recordReview(course, step.fen, true);
        setCorrect((n) => n + 1);
      }
      setFailed(false);
      setPly(ply + 1);
      return;
    }
    if (!failed) {
      recordReview(course, step.fen, false);
      setMissed((list) => [...list, `${moveLabel(step.fen)}${step.san}`]);
      setFailed(true);
    }
    // Show the wrong move briefly, then take it back.
    setWrong({ fen: m.after, square: to });
    window.setTimeout(() => setWrong(null), 700);
  }

  const highlights: Record<string, string> = {};
  const last = steps[ply - 1];
  if (last) highlights[last.from] = highlights[last.to] = LAST_MOVE;
  if (wrong) highlights[wrong.square] = WRONG;
  const arrows: Arrow[] =
    quizzing && failed && !wrong ? [{ startSquare: step.from, endSquare: step.to, color: SHOWN }] : [];
  const answered = correct + missed.length;

  const panel = finished ? (
    <>
      <div>
        <p className="text-xs text-foreground/50">{course.title}</p>
        <h1 className="text-lg leading-tight font-bold">{total ? "Review done" : "Nothing to review"}</h1>
      </div>
      {total > 0 && (
        <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm">
          <p className="font-semibold">
            {correct}/{total} correct
          </p>
          {missed.length > 0 && (
            <p className="mt-1 text-foreground/70">
              Missed: <span className="font-mono">{missed.join(", ")}</span>. They come back in a few hours.
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-foreground/70">
        {nextIn === null ? "Learn a variation to start reviewing it." : `Next review in ${nextIn}.`}
      </p>
      <Link href={`/learn/${course.id}`} className="btn-primary text-center">
        Back to course
      </Link>
    </>
  ) : (
    <>
      <div>
        <p className="text-xs text-foreground/50">
          <Link href={`/learn/${course.id}`} className="hover:underline">
            {course.title}
          </Link>{" "}
          › Review · {answered}/{total}
        </p>
        <h1 className="text-lg leading-tight font-bold">{line!.variation.title}</h1>
        <p className="text-sm text-foreground/60">{line!.chapter.title}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-surface">
        <div className="h-full bg-accent" style={{ width: `${(100 * answered) / total}%` }} />
      </div>
      {ply > 0 && <MoveList moves={steps.slice(0, ply).map((s) => s.san)} ply={ply} onSelect={() => {}} />}
      {quizzing && (
        <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2 text-sm">
          {failed ? (
            <>
              <p className="font-semibold">
                The move is <span className="font-mono">{moveLabel(step.fen)}{step.san}</span>: play it.
              </p>
              {step.note && <p className="mt-1">{step.note}</p>}
            </>
          ) : (
            <p className="font-semibold">Your move: {moveLabel(step.fen)}?</p>
          )}
        </div>
      )}
      {lineDone && <p className="text-sm text-accent">Line done ✓</p>}
    </>
  );

  return (
    <GameLayout
      scrollPanel
      board={
        <Board
          fen={wrong?.fen ?? fen}
          orientation={course.side}
          canMove={quizzing && !wrong}
          onMove={onMove}
          highlights={highlights}
          arrows={arrows}
        />
      }
      panel={panel}
    />
  );
}
