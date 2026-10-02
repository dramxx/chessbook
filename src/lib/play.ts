// Shared types for 1v1 play (/play and /api/play). State lives in Vercel Runtime Cache: a
// regional, non-durable key-value store, so both browsers also keep the game and can restore it.

export type Player = { id: string; name: string };

export const TIME_CONTROLS = [1, 3, 5, 10, null] as const; // minutes per side; null = unlimited
export type Minutes = (typeof TIME_CONTROLS)[number];

// Server-kept clock. The side to move's clock runs from `clockStart`: when its browser first
// showed the position (`seenAt`), or at most LAG_MS after the move was stored, so polling delay
// isn't charged to the player. Clocks start after White's first move.
export type Clock = {
  minutes: number;
  white: number; // ms left, as of the last move
  black: number;
  movedAt: number | null; // server time of the last move
  seenAt: number | null; // server time the side to move first synced after it
};
export const LAG_MS = 2000;

export type Game = {
  id: string;
  white: Player;
  black: Player;
  moves: string[]; // SAN
  result: { score: string; text: string } | null;
  rematchBy: string | null; // player id that offered a rematch
  drawBy?: string | null; // player id with a pending draw offer
  next: string | null; // id of the accepted rematch game
  clock?: Clock | null; // null/absent = unlimited
};

export type Invite = { from: Player; at: number; minutes: Minutes };

export type ChatMessage = { from: string; text: string; at: number }; // from = player id
export const CHAT_MAX_LENGTH = 200;

export type SyncResponse = {
  players: (Player & { playing: boolean })[]; // online, excluding you
  invite: Invite | null; // pending invite to you
  outgoing: { to: string; declined: boolean } | null; // your pending invite
  gameId: string | null; // a game that just started for you
  game: Game | null;
  chat: ChatMessage[]; // the game's chat, oldest first; empty without a game
  now: number; // server time, to line up the clocks
};

export type Action =
  | { type: "sync"; me: Player; gameId: string | null }
  | { type: "invite"; me: Player; to: string; minutes: Minutes }
  | { type: "cancel"; me: Player }
  | { type: "respond"; me: Player; accept: boolean }
  | { type: "move"; me: Player; gameId: string; ply: number; san: string }
  | { type: "resign"; me: Player; gameId: string }
  | { type: "draw"; me: Player; gameId: string; answer?: "accept" | "decline" } // no answer = offer
  | { type: "rematch"; me: Player; gameId: string }
  | { type: "chat"; me: Player; gameId: string; text: string }
  | { type: "restore"; me: Player; game: Game };

export const colorOf = (game: Game, id: string): "white" | "black" | null =>
  game.white.id === id ? "white" : game.black.id === id ? "black" : null;

export const sideToMove = (game: Game): "white" | "black" => (game.moves.length % 2 === 0 ? "white" : "black");

// When the side to move's clock started, or null while it isn't running.
export function clockStart(clock: Clock): number | null {
  if (clock.movedAt === null) return null;
  return Math.min(clock.seenAt ?? Infinity, clock.movedAt + LAG_MS);
}

// Milliseconds left for each side at server time `now`, or null for an unlimited game.
export function timeLeft(game: Game, now: number): { white: number; black: number } | null {
  const c = game.clock;
  if (!c) return null;
  const left = { white: c.white, black: c.black };
  const start = clockStart(c);
  if (start !== null && !game.result) {
    const side = sideToMove(game);
    left[side] = Math.max(0, left[side] - Math.max(0, now - start));
  }
  return left;
}
