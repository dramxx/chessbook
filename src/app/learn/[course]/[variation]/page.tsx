"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { findCourse, isMine, lineOf, markLearned, moveLabel, variationsOf, INTERVALS_H } from "@/lib/learn";
import { playMoveSound } from "@/lib/sounds";

const LAST_MOVE = "rgba(255,255,51,.45)";
const WRONG = "rgba(230,60,50,.7)";
const SHOWN = "#5dab3a";
const OPPONENT_DELAY = 600;

export default function LearnVariationPage({ params }: { params: Promise<{ course: string; variation: string }> }) {
  const ids = use(params);
  const course = findCourse(ids.course);
  const all = course ? variationsOf(course) : [];
  const index = all.findIndex(({ variation }) => variation.id === ids.variation);
  const entry = all[index];

  const variation = entry?.variation;
  const steps = course && variation ? lineOf(course, variation) : [];
  // fens[i]: the position after i moves.
  const end = steps.at(-1);
  const fens = end ? [...steps.map((s) => s.fen), new Chess(end.fen).move(end.san).after] : [];
  const [ply, setPly] = useState(0); // moves played
  const [wrong, setWrong] = useState<{ fen: string; square: string } | null>(null);
  const feedEnd = useRef<HTMLDivElement>(null);

  const done = ply === steps.length && steps.length > 0;
  const step = steps[ply];
  const mine = !!course && !!step && isMine(step, course.side);

  // Opponent's moves play themselves.
  const autoFen = step && !mine ? step.fen : null;
  const autoSan = step?.san;
  useEffect(() => {
    if (!autoFen || !autoSan) return;
    const t = window.setTimeout(() => {
      playMoveSound(new Chess(autoFen).move(autoSan));
      setPly((p) => p + 1);
    }, OPPONENT_DELAY);
    return () => clearTimeout(t);
  }, [autoFen, autoSan]);

  useEffect(() => {
    if (done && course && variation) markLearned(course, variation);
  }, [done, course, variation]);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "nearest" });
  }, [ply]);

  if (!course || !entry || !variation) return <p className="p-8">Variation not found.</p>;
  const { chapter } = entry;
  const next = all[index + 1];
  const target = all.find(({ variation: v }) => v.id === variation.transposesTo);

  const fen = fens[ply];

  function onMove(from: string, to: string, promotion?: string) {
    if (!mine || wrong) return;
    const m = new Chess(step.fen).move({ from, to, promotion });
    playMoveSound(m);
    if (m.san === step.san) {
      setPly(ply + 1);
      return;
    }
    // Show the wrong move briefly, then take it back.
    setWrong({ fen: m.after, square: to });
    window.setTimeout(() => setWrong(null), 700);
  }

  const highlights: Record<string, string> = {};
  const last = steps[ply - 1];
  if (last) highlights[last.from] = highlights[last.to] = LAST_MOVE;
  if (wrong) highlights[wrong.square] = WRONG;
  const arrows: Arrow[] = mine && !wrong ? [{ startSquare: step.from, endSquare: step.to, color: SHOWN }] : [];

  const played = steps.slice(0, ply);
  const firstReview = INTERVALS_H[0];

  const panel = (
    <>
      <div>
        <p className="text-xs text-foreground/50">
          <Link href={`/learn/${course.id}`} className="hover:underline">
            {course.title}
          </Link>{" "}
          ›{" "}
          {chapter.ideas?.length ? (
            <Link href={`/learn/${course.id}/ideas/${chapter.id}`} className="hover:underline">
              {chapter.title}
            </Link>
          ) : (
            chapter.title
          )}
        </p>
        <h1 className="text-lg leading-tight font-bold">{variation.title}</h1>
        {variation.name && <p className="text-sm text-foreground/60">{variation.name}</p>}
        {variation.reach !== undefined && (
          <p className="mt-1 text-xs text-foreground/50">
            Comes up in {(100 * variation.reach).toFixed(1)}% of club games in the {course.title}
          </p>
        )}
      </div>

      {ply > 0 && <MoveList moves={played.map((s) => s.san)} ply={ply} onSelect={() => {}} />}

      <div className="flex flex-col gap-2 text-sm">
        {played.map(
          (s, i) =>
            s.note && (
              <p key={i} className="rounded bg-surface/60 px-3 py-2">
                <span className="mr-1 font-mono font-semibold">
                  {moveLabel(s.fen)}
                  {s.san}
                </span>
                {s.note}
              </p>
            ),
        )}
        {mine && (
          <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2">
            <p className="font-semibold">
              Your move: <span className="font-mono">{moveLabel(step.fen)}{step.san}</span>
            </p>
            {step.note && <p className="mt-1">{step.note}</p>}
            {wrong && <p className="mt-1 text-red-400">Not that one: play the move shown by the arrow.</p>}
          </div>
        )}
        {done && (
          <div className="rounded border border-accent/60 bg-accent/10 px-3 py-2">
            <p className="font-semibold">Variation learned ✓</p>
            {target && (
              <p className="mt-1">
                This position also arises in{" "}
                <Link href={`/learn/${course.id}/${target.variation.id}`} className="text-accent hover:underline">
                  {target.chapter.title}: {target.variation.title}
                </Link>
                , which continues from here.
              </p>
            )}
            <p className="mt-1 text-foreground/70">Its moves come up for review in {firstReview} hours.</p>
          </div>
        )}
      </div>

      {done && (
        <div className="flex flex-wrap gap-2">
          {next && (
            <Link href={`/learn/${course.id}/${next.variation.id}`} className="btn-primary">
              Next: {next.variation.title}
            </Link>
          )}
          <button className="btn-secondary" onClick={() => setPly(0)}>
            Again
          </button>
          <Link href={`/learn/${course.id}`} className="btn-secondary">
            Course
          </Link>
        </div>
      )}
      {done && !!variation.games?.length && (
        <div className="text-sm">
          <p className="font-semibold">Model games</p>
          <ul className="mt-1 grid gap-1">
            {variation.games.map((g) => (
              <li key={g.id}>
                <Link href={`/games/${g.id}?ply=${g.ply}`} className="text-accent hover:underline">
                  {g.white} – {g.black}
                </Link>{" "}
                <span className="text-foreground/50">
                  {g.result}
                  {g.year && `, ${g.year}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div ref={feedEnd} />

    </>
  );

  return (
    <GameLayout
      scrollPanel
      board={
        <Board
          fen={wrong?.fen ?? fen}
          orientation={course.side}
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
