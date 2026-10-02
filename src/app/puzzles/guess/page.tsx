"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { BestLine, GameOver } from "@/components/HighScore";
import { Engine } from "@/lib/engine";
import { findPosition, type GuessPosition } from "@/lib/guess";
import { readBest, saveBest, type Best } from "@/lib/best";
import { playMoveSound } from "@/lib/sounds";

const LIVES = 3;
const BEST_KEY = "guessmove.best";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const LAST_MOVE = "rgba(255,255,51,.45)";
const GOOD = "#5dab3a";
const WRONG = "rgba(230,60,50,.85)";

type Guess = { from: string; to: string; san: string; fen: string; correct: boolean };
type Attempt = { position: GuessPosition; correct: boolean };
type Run = { current: GuessPosition; guess: Guess | null; history: Attempt[] };

export default function GuessPage() {
  const engine = useRef<Engine>(null);
  const next = useRef<Promise<GuessPosition>>(null); // found in the background while the current one is played
  const [ready, setReady] = useState(false); // `next` has resolved
  const [best, setBest] = useState<Best | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [saved, setSaved] = useState(false);

  function prefetch() {
    const p = findPosition(engine.current!);
    next.current = p;
    p.then(() => next.current === p && setReady(true));
  }

  useEffect(() => {
    const e = new Engine();
    engine.current = e;
    e.setOptions({ MultiPV: 2 }).then(() => setBest(readBest(BEST_KEY)));
    prefetch();
    return () => e.terminate();
  }, []);

  const score = run?.history.filter((a) => a.correct).length ?? 0;
  const misses = run ? run.history.length - score : 0;
  const lives = LIVES - misses;
  const over = run !== null && lives <= 0;
  const newBest = over && score > 0 && score > (best?.score ?? 0);

  async function advance(history: Attempt[]) {
    const current = await next.current!;
    setRun({ current, guess: null, history });
    setReady(false);
    prefetch();
  }

  function start() {
    setSaved(false);
    advance([]);
  }

  function handleMove(from: string, to: string, promotion?: string) {
    if (!run || run.guess) return;
    const chess = new Chess(run.current.fen);
    const m = chess.move({ from, to, promotion });
    playMoveSound(m);
    // Mate is mate, whichever one the engine picked.
    const correct = m.lan === run.current.best || chess.isCheckmate();
    setRun({
      ...run,
      guess: { from, to, san: m.san, fen: chess.fen(), correct },
      history: [...run.history, { position: run.current, correct }],
    });
  }

  const pos = run?.current;
  const guess = run?.guess;
  const orientation = pos?.fen.split(" ")[1] === "b" ? "black" : "white";

  const highlights: Record<string, string> = {};
  const arrows: Arrow[] = [];
  if (pos?.lastMove && !guess?.correct) for (const sq of pos.lastMove) highlights[sq] = LAST_MOVE;
  if (pos && guess?.correct) highlights[guess.from] = highlights[guess.to] = LAST_MOVE;
  if (pos && guess && !guess.correct) {
    arrows.push({ startSquare: guess.from, endSquare: guess.to, color: WRONG });
    arrows.push({ startSquare: pos.best.slice(0, 2), endSquare: pos.best.slice(2, 4), color: GOOD });
  }

  return (
    <GameLayout
      board={
        <Board
          fen={pos ? (guess?.correct ? guess.fen : pos.fen) : START_FEN}
          orientation={orientation}
          canMove={!!pos && !guess}
          onMove={handleMove}
          highlights={highlights}
          arrows={arrows}
        />
      }
      panel={
        <>
          <h1 className="text-xl font-bold">Guess the Move</h1>

          {!run && (
            <>
              <p className="text-sm text-neutral-400">
                Positions from master games. Find Stockfish&apos;s best move, not necessarily the one that was played.
                Three strikes and you&apos;re out.
              </p>
              <BestLine best={best} />
              <button className="btn-primary" disabled={!ready} onClick={start}>
                {ready ? "Start" : "Finding a position…"}
              </button>
            </>
          )}

          {run && pos && (
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

              <div className="flex flex-col gap-1 rounded bg-[#1f1e1b] p-3 text-sm">
                <GameInfo position={pos} />
                <div className="font-semibold">{orientation === "white" ? "White" : "Black"} to move</div>
                {guess && <Verdict position={pos} guess={guess} />}
              </div>

              {guess && !over && (
                <button className="btn-primary" disabled={!ready} onClick={() => advance(run.history)}>
                  {ready ? "Next" : "Finding a position…"}
                </button>
              )}

              {over && (
                <GameOver
                  score={score}
                  label="found"
                  best={best}
                  newBest={newBest && !saved}
                  onSave={(name) => {
                    setBest(saveBest(BEST_KEY, name, score));
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
  );
}

function GameInfo({ position: { game } }: { position: GuessPosition }) {
  const elo = (e: number | null) => (e ? ` (${e})` : "");
  return (
    <div className="text-neutral-300">
      {game.white}
      {elo(game.whiteElo)} – {game.black}
      {elo(game.blackElo)}
      <div className="text-xs text-neutral-400">
        {[game.event, game.year].filter(Boolean).join(", ")}
      </div>
    </div>
  );
}

function Verdict({ position: pos, guess }: { position: GuessPosition; guess: Guess }) {
  const player = pos.ply % 2 === 0 ? pos.game.white : pos.game.black;
  const played = pos.game.moves[pos.ply];
  return (
    <div className="mt-1 flex flex-col gap-1">
      {guess.correct ? (
        <span className="font-semibold text-[#81b64c]">Correct! {guess.san} is best.</span>
      ) : (
        <span className="font-semibold text-red-400">
          {guess.san} is not it. Best was {pos.bestSan}.
        </span>
      )}
      <span className="text-neutral-300">
        {player} played {played}
        {played === pos.bestSan ? ", the engine's move." : "."}
      </span>
      <a
        href={`/games/${pos.game.id}?ply=${pos.ply}`}
        target="_blank"
        className="text-xs text-neutral-400 hover:text-neutral-200"
      >
        Open the game ↗
      </a>
    </div>
  );
}

function History({ history }: { history: Attempt[] }) {
  if (!history.length) return null;
  return (
    <div>
      <div className="mb-2 text-xs uppercase text-neutral-400">Moves</div>
      <div className="flex flex-wrap gap-1">
        {history.map(({ position, correct }, i) => (
          <a
            key={i}
            href={`/games/${position.game.id}?ply=${position.ply}`}
            target="_blank"
            className={`history-chip underline-offset-2 hover:underline ${
              correct ? "bg-[#81b64c]/25 text-[#a3d160]" : "bg-red-500/25 text-red-300"
            }`}
            title="Open the game in a new tab"
          >
            {position.bestSan}
          </a>
        ))}
      </div>
    </div>
  );
}
