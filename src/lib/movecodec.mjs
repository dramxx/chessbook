// One byte per move: the move's index in the position's legal moves, sorted by (from, to, promotion).
// A position never has more than 218 legal moves, so every index fits in a byte. Castling is
// king-to-rook (chessops' own form). Shared by scripts/import-games.mjs (encode) and the games API (decode).
import { Chess } from "chessops/chess";
import { parseSan, makeSan } from "chessops/san";

const PROMOS = [undefined, "knight", "bishop", "rook", "queen"];

function legalMoves(pos) {
  const moves = [];
  for (const [from, dests] of pos.allDests()) {
    const pawn = pos.board.get(from)?.role === "pawn";
    for (const to of dests) {
      if (pawn && (to >> 3 === 0 || to >> 3 === 7)) {
        for (let p = 1; p < PROMOS.length; p++) moves.push({ from, to, promotion: PROMOS[p], key: (from * 64 + to) * 5 + p });
      } else {
        moves.push({ from, to, key: (from * 64 + to) * 5 });
      }
    }
  }
  return moves.sort((a, b) => a.key - b.key);
}

const keyOf = (m) => (m.from * 64 + m.to) * 5 + PROMOS.indexOf(m.promotion);

/** SAN list → Uint8Array, or null if a move is illegal. */
export function encodeMoves(sans) {
  const pos = Chess.default();
  const out = new Uint8Array(sans.length);
  for (let i = 0; i < sans.length; i++) {
    const move = parseSan(pos, sans[i]);
    if (!move) return null;
    const key = keyOf(move);
    const idx = legalMoves(pos).findIndex((m) => m.key === key);
    if (idx < 0) return null;
    out[i] = idx;
    pos.play(move);
  }
  return out;
}

/** Uint8Array → SAN list. */
export function decodeMoves(bytes) {
  const pos = Chess.default();
  const sans = [];
  for (const idx of bytes) {
    const move = legalMoves(pos)[idx];
    sans.push(makeSan(pos, move));
    pos.play(move);
  }
  return sans;
}
