"use client";

import { useEffect, useRef, useState } from "react";
import { PuzzlePlayer, playerColor } from "@/components/PuzzlePlayer";
import { Board } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { loadPuzzles, pickPuzzle, targetRating, type Puzzle } from "@/lib/puzzles";
import { readBest, saveBest, type Best } from "@/lib/best";
import { playCountdownBeep } from "@/lib/sounds";

const LIVES = 3;
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Attempt = { puzzle: Puzzle; solved: boolean };
type Run = { current: Puzzle; history: Attempt[]; used: Set<string> };

export default function SurvivalPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [saved, setSaved] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => {
    loadPuzzles().then((p) => {
      setPuzzles(p);
      setBest(readBest());
    });
    return () => clearTimeout(timer.current);
  }, []);

  const score = run?.history.filter((a) => a.solved).length ?? 0;
  const misses = run ? run.history.length - score : 0;
  const lives = LIVES - misses;
  const over = run !== null && lives <= 0 && feedback === null;
  const newBest = over && score > 0 && score > (best?.score ?? 0);

  function start() {
    if (!puzzles) return;
    const tick = (n: number) => {
      setCountdown(n);
      playCountdownBeep(3 - n);
      timer.current = window.setTimeout(() => {
        if (n > 1) return tick(n - 1);
        setCountdown(null);
        begin();
      }, 1000);
    };
    tick(3);
  }

  function begin() {
    if (!puzzles) return;
    const current = pickPuzzle(puzzles, targetRating(0), new Set());
    setRun({ current, history: [], used: new Set([current.id]) });
    setFeedback(null);
    setSaved(false);
  }

  function finish(solved: boolean) {
    if (!run || !puzzles) return;
    const history = [...run.history, { puzzle: run.current, solved }];
    setRun({ ...run, history });
    setFeedback(solved ? "correct" : "wrong");
    const gameOver = history.filter((a) => !a.solved).length >= LIVES;
    timer.current = window.setTimeout(
      () => {
        setFeedback(null);
        if (gameOver) return;
        const next = pickPuzzle(puzzles, targetRating(history.length), run.used);
        setRun({ current: next, history, used: new Set(run.used).add(next.id) });
      },
      solved ? 600 : 2200,
    );
  }

  return (
    <>
    {countdown !== null && <div className="fixed inset-0 z-40 bg-black/60" />}
    <GameLayout
      boardOverlay={
        countdown !== null && (
          <span key={countdown} className="countdown-number text-[min(40vw,40dvh)] font-bold leading-none text-white">
            {countdown}
          </span>
        )
      }
      board={
        run ? (
          <PuzzlePlayer
            key={run.current.id}
            puzzle={run.current}
            onSolved={() => finish(true)}
            onFailed={() => finish(false)}
          />
        ) : (
          <Board fen={START_FEN} orientation="white" canMove={false} onMove={() => {}} />
        )
      }
      panel={
        <>
          <h1 className="text-xl font-bold">Puzzle Rush · Survival</h1>

          {!run && (
            <>
              <p className="text-sm text-neutral-400">
                No clock. Three strikes and you&apos;re out. Puzzles get harder as you go.
              </p>
              <BestLine best={best} />
              <button className="btn-primary" disabled={!puzzles} onClick={start}>
                {puzzles ? "Start" : "Loading puzzles…"}
              </button>
            </>
          )}

          {run && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase text-neutral-400">Score</div>
                  <div className="text-5xl font-bold">{score}</div>
                </div>
                <div className="flex gap-1 text-2xl" aria-label={`${lives} lives left`}>
                  {Array.from({ length: LIVES }, (_, i) => (
                    <span key={i} className={i < misses ? "text-red-500" : "text-neutral-600"}>
                      ✕
                    </span>
                  ))}
                </div>
              </div>

              {!over && (
                <div className="rounded bg-[#1f1e1b] p-3">
                  <div className="flex justify-between text-sm">
                    <span>{playerColor(run.current) === "white" ? "White" : "Black"} to move</span>
                    <span className="font-mono text-neutral-300">ELO {run.current.rating}</span>
                  </div>
                  <div className="mt-1 h-5 text-sm font-semibold">
                    {feedback === "correct" && <span className="text-[#81b64c]">Correct!</span>}
                    {feedback === "wrong" && (
                      <span className="text-red-400">Wrong. Here&apos;s the solution.</span>
                    )}
                  </div>
                </div>
              )}

              {over && (
                <GameOver
                  score={score}
                  best={best}
                  newBest={newBest && !saved}
                  onSave={(name) => {
                    setBest(saveBest(name, score));
                    setSaved(true);
                  }}
                  onRestart={start}
                />
              )}

              <History history={run.history} />
            </>
          )}
        </>
      }
    />
    </>
  );
}

function BestLine({ best }: { best: Best | null }) {
  if (!best) return <p className="text-sm text-neutral-400">No high score yet.</p>;
  return (
    <p className="text-sm">
      High score: <b>{best.score}</b> by <b>{best.name}</b>
    </p>
  );
}

function GameOver(props: {
  score: number;
  best: Best | null;
  newBest: boolean;
  onSave: (name: string) => void;
  onRestart: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded bg-[#1f1e1b] p-3">
      <div className="text-lg font-bold">Game over: {props.score} solved</div>
      {props.newBest ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) props.onSave(name.trim());
          }}
        >
          <label className="text-sm text-[#81b64c]">New high score! Your name:</label>
          <div className="flex gap-2">
            <input
              autoFocus
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded bg-[#3c3a37] px-2 py-1 outline-none focus:ring-2 focus:ring-[#81b64c]"
            />
            <button className="btn-primary px-3 py-1" type="submit">
              Save
            </button>
          </div>
        </form>
      ) : (
        <>
          <BestLine best={props.best} />
          <button className="btn-primary" onClick={props.onRestart}>
            Play again
          </button>
        </>
      )}
    </div>
  );
}

function History({ history }: { history: Attempt[] }) {
  if (!history.length) return null;
  return (
    <div>
      <div className="mb-2 text-xs uppercase text-neutral-400">Puzzles</div>
      <div className="flex flex-wrap gap-1">
        {history.map(({ puzzle, solved }, i) =>
          solved ? (
            <span
              key={i}
              className="history-chip bg-[#81b64c]/25 text-[#a3d160]"
              title={`ELO ${puzzle.rating}`}
            >
              {puzzle.rating}
            </span>
          ) : (
            <a
              key={i}
              href={`/puzzles/${puzzle.id}`}
              target="_blank"
              className="history-chip bg-red-500/25 text-red-300 underline-offset-2 hover:underline"
              title="Retry (unranked) in a new tab"
            >
              {puzzle.rating} ↻
            </a>
          ),
        )}
      </div>
    </div>
  );
}
