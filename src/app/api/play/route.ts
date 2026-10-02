import { Chess } from "chess.js";
import { getCache } from "@vercel/functions";
import {
  colorOf,
  sideToMove,
  timeLeft,
  TIME_CONTROLS,
  type Action,
  type Game,
  type Invite,
  type Player,
  type SyncResponse,
} from "@/lib/play";

// 1v1 play backend. Browsers poll `sync`; everything is stored in Vercel Runtime Cache. On Hobby
// that cache is shared by all projects of the team, hence the namespace. Writes are plain
// get-then-set: fine for two players, where only the side to move writes the game.
const cache = getCache({ namespace: "chessbook-play" });

const ONLINE_MS = 15_000; // dropped from the lobby after this long without a sync
const LOBBY_WRITE_MS = 4_000; // refresh your own lobby entry at most this often
const DAY = 86_400;

type Lobby = Record<string, { name: string; seen: number; playing: boolean }>;
type Outgoing = { to: string; declined: boolean };

const get = async <T>(key: string) => ((await cache.get(key)) as T | null) ?? null;
const set = (key: string, value: unknown, ttl: number) => cache.set(key, value, { ttl, name: "" });

function outcome(chess: Chess): Game["result"] {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? { score: "0-1", text: "Checkmate, Black wins" } : { score: "1-0", text: "Checkmate, White wins" };
  }
  const draw = (why: string) => ({ score: "1/2-1/2", text: `Draw: ${why}` });
  if (chess.isStalemate()) return draw("stalemate");
  if (chess.isInsufficientMaterial()) return draw("insufficient material");
  if (chess.isThreefoldRepetition()) return draw("threefold repetition");
  if (chess.isDrawByFiftyMoves()) return draw("50-move rule");
  return null;
}

function newGame(white: Player, black: Player, minutes: number | null): Game {
  const ms = (minutes ?? 0) * 60_000;
  return {
    id: crypto.randomUUID(),
    white,
    black,
    moves: [],
    result: null,
    rematchBy: null,
    next: null,
    clock: minutes ? { minutes, white: ms, black: ms, movedAt: null, seenAt: null } : null,
  };
}

// Only a lone king, or king and one minor piece, can't mate.
function canMate(chess: Chess, color: "w" | "b") {
  const pieces = chess.board().flat().filter((p) => p && p.color === color && p.type !== "k");
  return !(pieces.length === 0 || (pieces.length === 1 && (pieces[0]!.type === "n" || pieces[0]!.type === "b")));
}

// The game with the side to move lost on time, or null if its clock hasn't run out.
function flagged(game: Game, now: number): Game | null {
  const left = timeLeft(game, now);
  const side = sideToMove(game);
  if (!left || game.result || left[side] > 0) return null;
  const chess = new Chess();
  for (const san of game.moves) chess.move(san);
  const winner = side === "white" ? "black" : "white";
  const result = canMate(chess, winner[0] as "w" | "b")
    ? { score: winner === "white" ? "1-0" : "0-1", text: `${game[winner].name} wins on time` }
    : { score: "1/2-1/2", text: "Draw: timeout vs insufficient material" };
  return { ...game, result, drawBy: null, clock: { ...game.clock!, [side]: 0 } };
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const action = (await request.json().catch(() => null)) as Action | null;
  const me = action?.me;
  if (!action || typeof me?.id !== "string" || typeof me.name !== "string") return fail(400, "bad request");
  const player: Player = { id: me.id.slice(0, 64), name: me.name.trim().slice(0, 20) || "?" };

  switch (action.type) {
    case "sync": {
      const now = Date.now();
      const [lobby, invite, outgoing, started, stored] = await Promise.all([
        get<Lobby>("lobby").then((l) => l ?? {}),
        get<Invite>(`invite:${player.id}`),
        get<Outgoing>(`outgoing:${player.id}`),
        get<string>(`started:${player.id}`),
        action.gameId ? get<Game>(`game:${action.gameId}`) : null,
      ]);
      // Clocks: the side to move has now seen the position; a clock at zero ends the game.
      let game = stored;
      if (game?.clock && !game.result) {
        const c = game.clock;
        let updated = flagged(game, now);
        if (!updated && c.movedAt !== null && c.seenAt === null && colorOf(game, player.id) === sideToMove(game)) {
          updated = { ...game, clock: { ...c, seenAt: now } };
        }
        if (updated) {
          game = updated;
          await set(`game:${game.id}`, game, DAY);
        }
      }
      const playing = game !== null && game.result === null;
      const mine = lobby[player.id];
      const stale = Object.entries(lobby).filter(([, p]) => now - p.seen > ONLINE_MS);
      if (!mine || now - mine.seen > LOBBY_WRITE_MS || mine.name !== player.name || mine.playing !== playing || stale.length) {
        for (const [id] of stale) delete lobby[id];
        lobby[player.id] = { name: player.name, seen: now, playing };
        await set("lobby", lobby, 3600);
      }
      if (started) await cache.delete(`started:${player.id}`);
      const body: SyncResponse = {
        players: Object.entries(lobby)
          .filter(([id]) => id !== player.id)
          .map(([id, p]) => ({ id, name: p.name, playing: p.playing })),
        invite: invite && lobby[invite.from.id] ? invite : null,
        outgoing,
        gameId: started,
        game,
        now,
      };
      return Response.json(body);
    }

    case "invite": {
      if (action.to === player.id) return fail(400, "can't invite yourself");
      const minutes = TIME_CONTROLS.includes(action.minutes) ? action.minutes : 3;
      await set(`invite:${action.to}`, { from: player, at: Date.now(), minutes } satisfies Invite, 60);
      await set(`outgoing:${player.id}`, { to: action.to, declined: false } satisfies Outgoing, 60);
      return Response.json({ ok: true });
    }

    case "cancel": {
      const outgoing = await get<Outgoing>(`outgoing:${player.id}`);
      if (outgoing) {
        const invite = await get<Invite>(`invite:${outgoing.to}`);
        if (invite?.from.id === player.id) await cache.delete(`invite:${outgoing.to}`);
      }
      await cache.delete(`outgoing:${player.id}`);
      return Response.json({ ok: true });
    }

    case "respond": {
      const invite = await get<Invite>(`invite:${player.id}`);
      if (!invite) return fail(410, "invite expired");
      await cache.delete(`invite:${player.id}`);
      if (!action.accept) {
        await set(`outgoing:${invite.from.id}`, { to: player.id, declined: true } satisfies Outgoing, 60);
        return Response.json({ ok: true });
      }
      const minutes = invite.minutes ?? null;
      const game = Math.random() < 0.5 ? newGame(invite.from, player, minutes) : newGame(player, invite.from, minutes);
      await set(`game:${game.id}`, game, DAY);
      await set(`started:${invite.from.id}`, game.id, 120);
      await cache.delete(`outgoing:${invite.from.id}`);
      return Response.json({ gameId: game.id });
    }

    case "move": {
      const stored = await get<Game>(`game:${action.gameId}`);
      if (!stored) return fail(404, "game not found");
      const now = Date.now();
      const timeout = flagged(stored, now);
      if (timeout) {
        await set(`game:${stored.id}`, timeout, DAY);
        return Response.json({ game: timeout });
      }
      const game = stored;
      const chess = new Chess();
      for (const san of game.moves) chess.move(san);
      if (game.result || colorOf(game, player.id)?.[0] !== chess.turn() || action.ply !== game.moves.length) {
        return fail(409, "not your move");
      }
      try {
        chess.move(action.san);
      } catch {
        return fail(400, "illegal move");
      }
      // Moving instead of answering declines the opponent's draw offer.
      const drawBy = game.drawBy === player.id ? game.drawBy : null;
      const left = timeLeft(game, now);
      const clock = game.clock && left && { ...game.clock, ...left, movedAt: now, seenAt: null };
      const updated = { ...game, moves: chess.history(), result: outcome(chess), drawBy, clock };
      await set(`game:${game.id}`, updated, DAY);
      return Response.json({ game: updated });
    }

    case "draw": {
      const game = await get<Game>(`game:${action.gameId}`);
      if (!game || !colorOf(game, player.id) || game.result) return fail(409, "no draw");
      const offered = game.drawBy && game.drawBy !== player.id;
      let updated: Game;
      if (!action.answer) updated = offered ? game : { ...game, drawBy: player.id };
      else if (!offered) return fail(409, "no draw offer");
      else if (action.answer === "accept") updated = { ...game, drawBy: null, result: { score: "1/2-1/2", text: "Draw by agreement" } };
      else updated = { ...game, drawBy: null };
      await set(`game:${game.id}`, updated, DAY);
      return Response.json({ game: updated });
    }

    case "resign": {
      const game = await get<Game>(`game:${action.gameId}`);
      const color = game && colorOf(game, player.id);
      if (!game || !color || game.result) return fail(409, "can't resign");
      const updated: Game = {
        ...game,
        result: color === "white" ? { score: "0-1", text: "White resigned, Black wins" } : { score: "1-0", text: "Black resigned, White wins" },
      };
      await set(`game:${game.id}`, updated, DAY);
      return Response.json({ game: updated });
    }

    case "rematch": {
      const game = await get<Game>(`game:${action.gameId}`);
      if (!game || !colorOf(game, player.id) || !game.result) return fail(409, "no rematch");
      if (game.next) return Response.json({ game });
      let updated: Game;
      if (game.rematchBy && game.rematchBy !== player.id) {
        const next = newGame(game.black, game.white, game.clock?.minutes ?? null); // colours swapped
        await set(`game:${next.id}`, next, DAY);
        updated = { ...game, next: next.id };
      } else {
        updated = { ...game, rematchBy: player.id };
      }
      await set(`game:${game.id}`, updated, DAY);
      return Response.json({ game: updated });
    }

    case "restore": {
      // The cache lost a game one of its players still has: put it back after checking the moves.
      const g = action.game;
      if (!g?.id || !colorOf(g, player.id) || (await get<Game>(`game:${g.id}`))) return fail(409, "not restored");
      const chess = new Chess();
      try {
        for (const san of g.moves) chess.move(san);
      } catch {
        return fail(400, "illegal moves");
      }
      const restored: Game = { ...g, moves: chess.history() };
      await set(`game:${g.id}`, restored, DAY);
      return Response.json({ game: restored });
    }
  }
  return fail(400, "unknown action");
}
