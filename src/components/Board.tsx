import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, defaultPieces } from "react-chessboard";

export type Arrow = { startSquare: string; endSquare: string; color: string };

type Props = {
  fen: string;
  orientation: "white" | "black";
  canMove: boolean;
  moveBothSides?: boolean; // analysis boards: whoever is to move can move, not only the orientation's color
  onMove: (from: string, to: string, promotion?: string) => void;
  canPremove?: boolean; // opponent to move: own pieces can be queued to any square
  onPremove?: (move: { from: string; to: string } | null) => void; // null cancels
  highlights?: Record<string, string>; // square -> background color
  arrows?: Arrow[];
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const DOT = "radial-gradient(circle, rgba(0,0,0,.18) 22%, transparent 24%)";
const RING = "radial-gradient(circle, transparent 72%, rgba(0,0,0,.18) 74%)";
const SELECTED = "rgba(255,255,51,.5)";

export function Board({
  fen,
  orientation,
  canMove,
  moveBothSides = false,
  onMove,
  canPremove = false,
  onPremove,
  highlights = {},
  arrows = [],
}: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const myColor = moveBothSides ? chess.turn() : orientation[0]; // "w" | "b"
  const premoving = canPremove && !canMove;
  // Pending promotion is tied to the position it was made in. A selection survives position
  // changes (e.g. picked during the opponent's turn) while the square still holds our piece.
  const [sel, setSel] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ fen: string; from: string; to: string } | null>(null);
  const selected =
    (canMove || premoving) && sel && chess.get(sel as Square)?.color === myColor ? sel : null;
  const pendingPromo = canMove && promo?.fen === fen ? promo : null;

  const targets = useMemo(
    () => (selected ? chess.moves({ square: selected as Square, verbose: true }) : []),
    [chess, selected],
  );

  function attempt(from: string, to: string) {
    const legal = chess.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    setSel(null);
    if (!legal.length) return false;
    if (legal.some((m) => m.promotion)) {
      setPromo({ fen, from, to });
      return false;
    }
    onMove(from, to);
    return true;
  }

  const styles: Record<string, React.CSSProperties> = {};
  for (const [sq, color] of Object.entries(highlights)) styles[sq] = { backgroundColor: color };
  if (selected) styles[selected] = { ...styles[selected], backgroundColor: SELECTED };
  for (const m of targets) {
    styles[m.to] = { ...styles[m.to], backgroundImage: m.captured ? RING : DOT };
  }

  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const coord = "flex items-center justify-center text-xs sm:text-sm font-semibold text-[#9a9f8f] select-none";

  return (
    <div className="grid grid-cols-[1.25rem_1fr] grid-rows-[1fr_1.25rem] w-full">
      <div className="grid grid-rows-8">
        {ranks.map((r) => (
          <div key={r} className={coord}>{r}</div>
        ))}
      </div>
      <div className="relative aspect-square rounded-sm overflow-hidden shadow-lg">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            showNotation: false,
            animationDurationInMs: 200,
            allowDragging: canMove || premoving,
            canDragPiece: ({ piece }) => piece.pieceType[0] === myColor,
            darkSquareStyle: { backgroundColor: "#739552" },
            lightSquareStyle: { backgroundColor: "#ebecd0" },
            squareStyles: styles,
            arrows,
            onPieceDrag: ({ square }) => square && setSel(square),
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              if (canMove) return attempt(sourceSquare, targetSquare);
              setSel(null);
              if (targetSquare !== sourceSquare) onPremove?.({ from: sourceSquare, to: targetSquare });
              return false;
            },
            onSquareClick: ({ piece, square }) => {
              if (premoving) {
                if (piece?.pieceType[0] === myColor && square !== selected) {
                  setSel(square);
                  onPremove?.(null);
                } else {
                  if (selected && square !== selected) onPremove?.({ from: selected, to: square });
                  else onPremove?.(null);
                  setSel(null);
                }
                return;
              }
              if (!canMove) return;
              if (selected && targets.some((m) => m.to === square)) attempt(selected, square);
              else if (piece?.pieceType[0] === myColor && square !== selected) setSel(square);
              else setSel(null);
            },
          }}
        />
        {pendingPromo && (
          <div className="absolute inset-0 z-10 bg-black/30" onClick={() => setPromo(null)}>
            {/* Column on the promotion square (where the cursor is), queen first, extending toward the board's center. */}
            <div
              className={`absolute flex w-[12.5%] overflow-hidden rounded bg-white shadow-xl ${
                ranks.indexOf(pendingPromo.to[1]) < 4 ? "flex-col" : "flex-col-reverse"
              }`}
              style={{
                left: `${files.indexOf(pendingPromo.to[0]) * 12.5}%`,
                top: `${Math.min(ranks.indexOf(pendingPromo.to[1]), 4) * 12.5}%`,
              }}
            >
              {["q", "r", "b", "n"].map((p) => (
                <button
                  key={p}
                  className="aspect-square w-full hover:bg-[#739552]/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPromo(null);
                    onMove(pendingPromo.from, pendingPromo.to, p);
                  }}
                >
                  {defaultPieces[`${myColor}${p.toUpperCase()}`]()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div />
      <div className="grid grid-cols-8">
        {files.map((f) => (
          <div key={f} className={coord}>{f}</div>
        ))}
      </div>
    </div>
  );
}
