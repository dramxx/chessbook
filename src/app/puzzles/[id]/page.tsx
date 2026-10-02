"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PuzzlePlayer, playerColor } from "@/components/PuzzlePlayer";
import { GameLayout } from "@/components/GameLayout";
import { loadPuzzles, type Puzzle } from "@/lib/puzzles";

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [result, setResult] = useState<"solved" | "wrong" | null>(null);

  useEffect(() => {
    loadPuzzles().then((all) => setPuzzle(all.find((p) => p.id === id) ?? null));
  }, [id]);

  if (puzzle === undefined) return <p className="p-8 text-neutral-400">Loading…</p>;
  if (puzzle === null) return <p className="p-8">Puzzle not found.</p>;

  function restart() {
    setAttempt((a) => a + 1);
    setHintLevel(0);
    setResult(null);
  }

  return (
    <GameLayout
      board={
        <PuzzlePlayer
          key={attempt}
          puzzle={puzzle}
          retryOnWrong
          hintLevel={hintLevel}
          onSolved={() => setResult("solved")}
          onFailed={() => setResult("wrong")}
          onProgress={() => {
            setHintLevel(0);
            setResult(null);
          }}
        />
      }
      panel={
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Puzzle</h1>
            <span className="rounded bg-[#3c3a37] px-2 py-0.5 text-xs uppercase text-neutral-300">
              Unranked
            </span>
          </div>
          <div className="flex justify-between rounded bg-[#1f1e1b] p-3 text-sm">
            <span>{playerColor(puzzle) === "white" ? "White" : "Black"} to move</span>
            <span className="font-mono text-neutral-300">ELO {puzzle.rating}</span>
          </div>
          <div className="h-5 text-sm font-semibold">
            {result === "solved" && <span className="text-[#81b64c]">Solved!</span>}
            {result === "wrong" && <span className="text-red-400">Not the move. Try again.</span>}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1"
              disabled={hintLevel >= 2 || result === "solved"}
              onClick={() => setHintLevel((h) => h + 1)}
            >
              {hintLevel === 0 ? "Hint" : "Show move"}
            </button>
            <button className="btn-secondary flex-1" onClick={restart}>
              Retry
            </button>
          </div>
          <Link href="/puzzles/rush" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← Puzzle Rush
          </Link>
        </>
      }
    />
  );
}
