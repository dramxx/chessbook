// Finished games against Stockfish and friends, kept in this browser only (newest first).
export type SavedGame = {
  id: string;
  date: number; // ms
  white: string;
  black: string;
  you: "white" | "black";
  result: string; // "1-0", "0-1" or "1/2-1/2"
  text: string; // how it ended
  moves: string[]; // SAN
};

const KEY = "chessbook.history";
const MAX = 100;

export function listGames(): SavedGame[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

// Adds a game once; saving the same id again does nothing.
export function saveGame(game: SavedGame) {
  const saved = listGames();
  if (saved.some((g) => g.id === game.id)) return;
  const games = [game, ...saved].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {}
}
