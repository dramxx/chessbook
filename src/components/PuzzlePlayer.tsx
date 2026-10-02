import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Board, type Arrow } from "./Board";
import type { Puzzle } from "@/lib/puzzles";
import { playMoveSound } from "@/lib/sounds";

type Props = {
  puzzle: Puzzle; // remount (key) to restart
  retryOnWrong?: boolean; // replay mode: undo wrong moves instead of failing
  hintLevel?: number; // 1 = highlight piece, 2 = show move
  onSolved?: () => void;
  onFailed?: () => void;
  onProgress?: () => void; // correct move, puzzle continues
};

type Status = "waiting" | "playing" | "solved" | "failed";
type Premove = { from: string; to: string };

const LAST_MOVE = "rgba(255,255,51,.45)";
const WRONG = "rgba(230,60,50,.7)";
const HINT = "rgba(80,160,255,.6)";
const GOOD = "#5dab3a";
const PREMOVE = "rgba(244,42,50,.45)";

const squares = (uci: string) => [uci.slice(0, 2), uci.slice(2, 4)] as const;
const toMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

export function playerColor(puzzle: Puzzle): "white" | "black" {
  // The FEN has the opponent to move; the player answers.
  return puzzle.fen.split(" ")[1] === "w" ? "black" : "white";
}

export function PuzzlePlayer({ puzzle, retryOnWrong = false, hintLevel = 0, onSolved, onFailed, onProgress }: Props) {
  const [chess] = useState(() => new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [ply, setPly] = useState(0); // index of the next solution move
  const [status, setStatus] = useState<Status>("waiting");
  const [lastMove, setLastMove] = useState<readonly [string, string] | null>(null);
  const [wrong, setWrong] = useState<string | null>(null); // destination of a wrong move
  const [premove, setPremove] = useState<Premove | null>(null);
  const premoveRef = useRef<Premove | null>(null); // read from timers, which hold stale state
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function queuePremove(p: Premove | null) {
    premoveRef.current = p;
    setPremove(p);
  }

  function play(uci: string) {
    const m = chess.move(toMove(uci));
    playMoveSound(m);
    setFen(chess.fen());
    setLastMove([m.from, m.to]);
  }

  // Opponent's setup move.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const m = chess.move(toMove(puzzle.moves[0]));
      playMoveSound(m);
      setFen(chess.fen());
      setLastMove([m.from, m.to]);
      setPly(1);
      setStatus("playing");
    }, 600);
    const pending = timers.current;
    return () => {
      clearTimeout(t);
      pending.forEach(clearTimeout);
    };
  }, [chess, puzzle]);

  function handleMove(from: string, to: string, promotion?: string) {
    if (status !== "playing") return;
    queuePremove(null);
    const m = chess.move({ from, to, promotion });
    playMoveSound(m);
    setFen(chess.fen());
    setLastMove([from, to]);

    // Any mate is accepted, as on Lichess and chess.com.
    if (from + to + (m.promotion ?? "") === puzzle.moves[ply] || chess.isCheckmate()) {
      if (ply + 1 >= puzzle.moves.length || chess.isCheckmate()) {
        setStatus("solved");
        onSolved?.();
        return;
      }
      setStatus("waiting");
      onProgress?.();
      later(() => {
        play(puzzle.moves[ply + 1]);
        setPly(ply + 2);
        setStatus("playing");
      }, 350);
      return;
    }

    setWrong(to);
    setStatus(retryOnWrong ? "waiting" : "failed");
    onFailed?.();
    later(() => {
      chess.undo();
      setFen(chess.fen());
      setLastMove(squares(puzzle.moves[ply - 1]));
      setWrong(null);
      if (retryOnWrong) setStatus("playing");
    }, 700);
  }

  // Once the opponent has moved, play the queued premove if it's legal now (auto-queen).
  const firePremove = useEffectEvent(() => {
    if (!premoveRef.current) return;
    later(() => {
      const p = premoveRef.current; // a manual move in the meantime clears it
      if (!p) return;
      const legal = chess.moves({ verbose: true }).find((m) => m.from === p.from && m.to === p.to);
      if (legal) handleMove(p.from, p.to, legal.promotion ? "q" : undefined);
      else queuePremove(null);
    }, 100);
  });
  // Also on `premove`: a drag begun in the opponent's turn and dropped after it arrives as a premove.
  useEffect(() => {
    if (status === "playing" && premove) firePremove();
  }, [status, premove]);

  const expected = puzzle.moves[ply];
  const showSolution = (status === "failed" && !wrong) || (hintLevel >= 2 && status === "playing");

  const highlights: Record<string, string> = {};
  if (lastMove) for (const sq of lastMove) highlights[sq] = LAST_MOVE;
  if (wrong) highlights[wrong] = WRONG;
  if (expected && hintLevel >= 1 && status === "playing") highlights[squares(expected)[0]] = HINT;
  if (status === "solved" && lastMove) highlights[lastMove[1]] = GOOD;
  if (premove) highlights[premove.from] = highlights[premove.to] = PREMOVE;

  const arrows: Arrow[] =
    showSolution && expected
      ? [{ startSquare: squares(expected)[0], endSquare: squares(expected)[1], color: GOOD }]
      : [];

  // Show a queued premove's piece on its destination square, as chess.com does.
  let shownFen = fen;
  if (premove) {
    const c = new Chess(fen);
    const piece = c.get(premove.from as Square);
    if (piece && piece.color === playerColor(puzzle)[0]) {
      c.remove(premove.from as Square);
      c.put(piece, premove.to as Square);
      shownFen = c.fen();
    }
  }

  return (
    <Board
      fen={shownFen}
      orientation={playerColor(puzzle)}
      canMove={status === "playing" && !premove}
      onMove={handleMove}
      // Opponent to move (not mid-retry after a wrong move): queue a premove.
      canPremove={status === "waiting" && !wrong && fen.split(" ")[1] !== playerColor(puzzle)[0]}
      onPremove={queuePremove}
      highlights={highlights}
      arrows={arrows}
    />
  );
}
