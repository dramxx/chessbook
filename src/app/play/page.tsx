"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { playMoveSound } from "@/lib/sounds";
import { colorOf, type Action, type Game, type Player, type SyncResponse } from "@/lib/play";

const ME_KEY = "chessbook.play.me";
const GAME_KEY = "chessbook.play.game";
const POLL_GAME_MS = 1000;
const POLL_LOBBY_MS = 2000;
const LAST_MOVE = "rgba(255,255,51,.4)";
const PREMOVE = "rgba(244,42,50,.45)";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function post<T>(action: Action): Promise<T | null> {
  try {
    const res = await fetch("/api/play", { method: "POST", body: JSON.stringify(action) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function PlayPage() {
  const [me, setMe] = useState<Player | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncResponse | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  const [view, setView] = useState<number | null>(null); // ply being reviewed after the game
  const gameRef = useRef<Game | null>(null); // latest game, for the poll loop

  // Identity and the current game survive reloads (this browser only).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage after hydration */
    setMe(load<Player>(ME_KEY));
    gameRef.current = load<Game>(GAME_KEY);
    setGame(gameRef.current);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const showGame = useCallback((g: Game | null) => {
    const prev = gameRef.current;
    if (g && prev?.id === g.id && g.moves.length > prev.moves.length) {
      const chess = new Chess();
      let last;
      for (const san of g.moves) last = chess.move(san);
      if (last) playMoveSound(last);
    }
    if (g?.id !== prev?.id) setView(null);
    gameRef.current = g;
    setGame(g);
    save(GAME_KEY, g);
  }, []);

  // Poll the server: lobby, invites, and the current game.
  const tick = useEffectEvent(async () => {
    if (!me) return;
    const current = gameRef.current;
    const res = await post<SyncResponse>({ type: "sync", me, gameId: current?.id ?? null });
    if (!res) return;
    setSync(res);
    if (res.gameId && (!current || current.result)) {
      const started = await post<SyncResponse>({ type: "sync", me, gameId: res.gameId });
      if (started?.game) showGame(started.game);
      return;
    }
    if (!current) return;
    if (res.game) {
      // An accepted rematch: both players move on to the new game.
      if (res.game.next) {
        const next = await post<SyncResponse>({ type: "sync", me, gameId: res.game.next });
        if (next?.game) return showGame(next.game);
      }
      // Ignore a poll that started before our own move was stored.
      if (res.game.moves.length >= current.moves.length || res.game.result) showGame(res.game);
    } else {
      // The cache lost the game: put back our copy.
      const restored = await post<{ game: Game }>({ type: "restore", me, game: current });
      if (restored) showGame(restored.game);
    }
  });
  const playing = game !== null && game.result === null;
  useEffect(() => {
    if (!me) return;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      await tick();
      busy = false;
    };
    run();
    const t = window.setInterval(run, playing ? POLL_GAME_MS : POLL_LOBBY_MS);
    return () => clearInterval(t);
  }, [me, playing]);

  const color = game && me ? colorOf(game, me.id) : null;
  const positions = useMemo(() => {
    const chess = new Chess();
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null }];
    for (const san of game?.moves ?? []) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, [game?.moves]);
  const moves = game?.moves ?? [];
  const ply = game?.result && view !== null ? view : moves.length;
  const { fen, last } = positions[ply];
  const myTurn = playing && color !== null && fen.split(" ")[1] === color[0];

  async function onMove(from: string, to: string, promotion?: string) {
    if (!game || !me || !myTurn) return;
    let san: string;
    try {
      const m = new Chess(fen).move({ from, to, promotion });
      san = m.san;
      playMoveSound(m);
    } catch {
      return;
    }
    setPremove(null);
    const optimistic = { ...game, moves: [...game.moves, san] };
    gameRef.current = optimistic;
    setGame(optimistic);
    const res = await post<{ game: Game }>({ type: "move", me, gameId: game.id, ply: game.moves.length, san });
    if (res) showGame(res.game);
  }

  // A premove queued during the opponent's turn is played once it's legal (auto-queen).
  const firePremove = useEffectEvent(() => {
    if (!premove) return;
    const legal = new Chess(fen).moves({ verbose: true }).find((m) => m.from === premove.from && m.to === premove.to);
    if (legal) onMove(premove.from, premove.to, legal.promotion ? "q" : undefined);
    else setPremove(null);
  });
  useEffect(() => {
    if (!myTurn || !premove) return;
    const t = window.setTimeout(firePremove, 100);
    return () => clearTimeout(t);
  }, [myTurn, premove]);

  if (!loaded) return null;
  if (!me) return <NameModal onSave={(p) => (save(ME_KEY, p), setMe(p))} />;

  const opponent = game && color ? (color === "white" ? game.black : game.white) : null;
  const opponentOnline = opponent ? sync?.players.some((p) => p.id === opponent.id) : false;
  const invite = sync?.invite ?? null;
  const outgoing = sync?.outgoing ?? null;

  const highlights: Record<string, string> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {};
  if (premove) highlights[premove.from] = highlights[premove.to] = PREMOVE;

  const lobbyPanel = (
    <>
      <div>
        <h1 className="text-xl font-bold">Play a friend</h1>
        <p className="text-sm text-foreground/60">
          You are <b className="text-foreground">{me.name}</b> ·{" "}
          <button className="underline" onClick={() => (save(ME_KEY, null), setMe(null))}>
            change
          </button>
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <h2 className="text-xs text-foreground/60 uppercase">Online</h2>
        {!sync ? (
          <p className="text-sm text-foreground/60">Connecting…</p>
        ) : sync.players.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No one else is here. Send your friend the link to this page; they&apos;ll show up once they
            enter a name.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sync.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded bg-surface px-3 py-2">
                <span className="size-2 rounded-full bg-accent" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.playing ? (
                  <span className="text-xs text-foreground/50">in a game</span>
                ) : outgoing?.to === p.id && !outgoing.declined ? (
                  <button className="btn-secondary text-sm" onClick={() => post({ type: "cancel", me })}>
                    Cancel
                  </button>
                ) : (
                  <button
                    className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                    onClick={() => post({ type: "invite", me, to: p.id })}
                  >
                    Play
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {outgoing && (
          <p className="text-sm text-foreground/60">
            {outgoing.declined
              ? `${sync?.players.find((p) => p.id === outgoing.to)?.name ?? "They"} declined.`
              : `Waiting for ${sync?.players.find((p) => p.id === outgoing.to)?.name ?? "them"} to accept…`}
          </p>
        )}
      </div>
    </>
  );

  const gamePanel = game && color && opponent && (
    <>
      <div>
        <h1 className="text-xl font-bold">
          {me.name} vs {opponent.name}
        </h1>
        <p className="flex items-center gap-1.5 text-sm text-foreground/60">
          {sync && (
            <>
              <span className={`size-2 rounded-full ${opponentOnline ? "bg-accent" : "bg-neutral-500"}`} />
              {opponentOnline ? "online" : "offline"} ·{" "}
            </>
          )}
          you play {color}
          {playing && (myTurn ? " · your move" : " · their move")}
        </p>
      </div>
      {game.result && <div className="rounded bg-surface p-3 font-bold">{game.result.text}</div>}
      <div className="max-h-48 min-h-0 flex-1 overflow-y-auto landscape:max-h-none">
        {moves.length > 0 && (
          <MoveList moves={moves} ply={ply} onSelect={(p) => game.result && setView(p)} newestFirst />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-surface pt-3">
        {playing ? (
          <button className="btn-secondary text-sm" onClick={async () => {
            const res = await post<{ game: Game }>({ type: "resign", me, gameId: game.id });
            if (res) showGame(res.game);
          }}>
            Resign
          </button>
        ) : (
          <>
            {game.rematchBy === me.id ? (
              <span className="text-sm text-foreground/60">Rematch offered…</span>
            ) : (
              <button
                className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                onClick={async () => {
                  const res = await post<{ game: Game }>({ type: "rematch", me, gameId: game.id });
                  if (res) showGame(res.game);
                }}
              >
                {game.rematchBy ? `Accept rematch` : "Rematch"}
              </button>
            )}
            <button className="btn-secondary ml-auto text-sm" onClick={() => showGame(null)}>
              Back to lobby
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      <GameLayout
        board={
          <Board
            fen={game ? fen : START_FEN}
            orientation={color ?? "white"}
            canMove={myTurn && !premove}
            onMove={onMove}
            canPremove={playing && !myTurn}
            onPremove={setPremove}
            highlights={highlights}
          />
        }
        panel={gamePanel || lobbyPanel}
      />
      {invite && !playing && (
        <Modal>
          <p className="text-lg">
            <b>{invite.from.name}</b> wants to play.
          </p>
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1"
              onClick={async () => {
                const res = await post<{ gameId: string }>({ type: "respond", me, accept: true });
                if (!res) return;
                const started = await post<SyncResponse>({ type: "sync", me, gameId: res.gameId });
                if (started?.game) showGame(started.game);
              }}
            >
              Accept
            </button>
            <button className="btn-secondary flex-1" onClick={() => post({ type: "respond", me, accept: false })}>
              Decline
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-panel p-6 shadow-xl">{children}</div>
    </div>
  );
}

function NameModal({ onSave }: { onSave: (p: Player) => void }) {
  const [name, setName] = useState("");
  return (
    <Modal>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (n) onSave({ id: crypto.randomUUID(), name: n.slice(0, 20) });
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">Your name</span>
          <span className="text-sm text-foreground/60">Shown to the other player.</span>
          <input
            autoFocus
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <button className="btn-primary" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </Modal>
  );
}
