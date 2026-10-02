// Shared types for 1v1 play (/play and /api/play). State lives in Vercel Runtime Cache: a
// regional, non-durable key-value store, so both browsers also keep the game and can restore it.

export type Player = { id: string; name: string };

export type Game = {
  id: string;
  white: Player;
  black: Player;
  moves: string[]; // SAN
  result: { score: string; text: string } | null;
  rematchBy: string | null; // player id that offered a rematch
  drawBy?: string | null; // player id with a pending draw offer
  next: string | null; // id of the accepted rematch game
};

export type Invite = { from: Player; at: number };

export type SyncResponse = {
  players: (Player & { playing: boolean })[]; // online, excluding you
  invite: Invite | null; // pending invite to you
  outgoing: { to: string; declined: boolean } | null; // your pending invite
  gameId: string | null; // a game that just started for you
  game: Game | null;
};

export type Action =
  | { type: "sync"; me: Player; gameId: string | null }
  | { type: "invite"; me: Player; to: string }
  | { type: "cancel"; me: Player }
  | { type: "respond"; me: Player; accept: boolean }
  | { type: "move"; me: Player; gameId: string; ply: number; san: string }
  | { type: "resign"; me: Player; gameId: string }
  | { type: "draw"; me: Player; gameId: string; answer?: "accept" | "decline" } // no answer = offer
  | { type: "rematch"; me: Player; gameId: string }
  | { type: "restore"; me: Player; game: Game };

export const colorOf = (game: Game, id: string): "white" | "black" | null =>
  game.white.id === id ? "white" : game.black.id === id ? "black" : null;
