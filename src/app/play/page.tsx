"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { analysisHref } from "@/lib/analysis";
import { saveGame } from "@/lib/history";
import { playMoveSound } from "@/lib/sounds";
import {
  CHAT_MAX_LENGTH,
  colorOf,
  sideToMove,
  timeLeft,
  TIME_CONTROLS,
  type Action,
  type ChatMessage,
  type Game,
  type Minutes,
  type Player,
  type SyncResponse,
} from "@/lib/play";

const ME_KEY = "chessbook.play.me";
const GAME_KEY = "chessbook.play.game";
const POLL_GAME_MS = 1000;
const POLL_TIMED_MS = 500;
const POLL_LOBBY_MS = 2000;
const IDLE_LOBBY_MS = 5 * 60_000; // no input for this long pauses polling
const IDLE_GAME_MS = 15 * 60_000;
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
  const [offset, setOffset] = useState(0); // server time minus local time
  const [now, setNow] = useState(0); // local time, ticking while a clock runs
  const [inviteTo, setInviteTo] = useState<Player | null>(null); // time control picker
  const [minutes, setMinutes] = useState<Minutes>(3);
  const [chat, setChat] = useState<{ gameId: string; messages: ChatMessage[] } | null>(null);
  const [tab, setTab] = useState<"moves" | "chat">("moves");
  const [chatSeen, setChatSeen] = useState<{ gameId: string; count: number } | null>(null); // read when leaving the chat tab

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

  // Messages only get added, so a shorter list is from a poll that started before our own message.
  const showChat = useCallback((gameId: string, messages: ChatMessage[]) => {
    setChat((c) => (c?.gameId === gameId && c.messages.length > messages.length ? c : { gameId, messages }));
  }, []);

  // Poll the server: lobby, invites, and the current game.
  const tick = useEffectEvent(async () => {
    if (!me) return;
    const current = gameRef.current;
    const res = await post<SyncResponse>({ type: "sync", me, gameId: current?.id ?? null });
    if (!res) return;
    setOffset(res.now - Date.now());
    setSync(res);
    if (res.game) showChat(res.game.id, res.chat);
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
  const timed = playing && !!game.clock;

  // Polling stops while the tab is hidden or no one has touched the page for a while, so an idle
  // tab makes no requests (and drops out of the lobby). Any input resumes it.
  const [active, setActive] = useState(() => typeof document === "undefined" || !document.hidden);
  const idleMs = playing ? IDLE_GAME_MS : IDLE_LOBBY_MS;
  useEffect(() => {
    let last = Date.now();
    const onInput = () => {
      last = Date.now();
      if (!document.hidden) setActive(true);
    };
    const onVisibility = () => (document.hidden ? setActive(false) : onInput());
    const t = window.setInterval(() => {
      if (Date.now() - last > idleMs) setActive(false);
    }, 10_000);
    const events = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
    for (const e of events) window.addEventListener(e, onInput, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(t);
      for (const e of events) window.removeEventListener(e, onInput);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [idleMs]);

  useEffect(() => {
    if (!me || !active) return;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      await tick();
      busy = false;
    };
    run();
    const t = window.setInterval(run, timed ? POLL_TIMED_MS : playing ? POLL_GAME_MS : POLL_LOBBY_MS);
    return () => clearInterval(t);
  }, [me, playing, timed, active]);

  useEffect(() => {
    if (!timed) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [timed]);

  const color = game && me ? colorOf(game, me.id) : null;

  // Finished games go to the history on the analysis page.
  useEffect(() => {
    if (!game?.result || !color) return;
    const { id, white, black, moves, result } = game;
    saveGame({ id, date: Date.now(), white: white.name, black: black.name, you: color, result: result.score, text: result.text, moves });
  }, [game, color]);
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
    // Stop our clock right away; the server's answer has the exact times.
    const serverNow = Date.now() + offset;
    const left = timeLeft(game, serverNow);
    const clock = game.clock && left && { ...game.clock, ...left, movedAt: serverNow, seenAt: null };
    const optimistic = { ...game, moves: [...game.moves, san], clock };
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

  // Game actions answer with the updated game.
  async function gameAction(action: Action) {
    const res = await post<{ game: Game }>(action);
    if (res) showGame(res.game);
  }

  const opponent = game && color ? (color === "white" ? game.black : game.white) : null;
  const opponentOnline = opponent ? sync?.players.some((p) => p.id === opponent.id) : false;
  const invite = sync?.invite ?? null;
  const outgoing = sync?.outgoing ?? null;

  const highlights: Record<string, string> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {};
  if (premove) highlights[premove.from] = highlights[premove.to] = PREMOVE;

  const messages = game && chat?.gameId === game.id ? chat.messages : [];
  const unread = tab === "moves" ? messages.length - (chatSeen?.gameId === game?.id ? chatSeen!.count : 0) : 0;
  function switchTab(t: "moves" | "chat") {
    if (t === "moves" && game) setChatSeen({ gameId: game.id, count: messages.length });
    setTab(t);
  }
  async function sendChat(text: string) {
    if (!game || !me) return false;
    const res = await post<{ chat: ChatMessage[] }>({ type: "chat", me, gameId: game.id, text });
    if (res) showChat(game.id, res.chat);
    return res !== null;
  }

  const left = game ? timeLeft(game, now + offset) : null;
  const clockFor = (side: "white" | "black") =>
    left && game && (
      <ClockFace ms={left[side]} active={playing && game.clock?.movedAt != null && sideToMove(game) === side} />
    );

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
                    onClick={() => setInviteTo(p)}
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
      {clockFor(color === "white" ? "black" : "white")}
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
      {playing && game.drawBy === opponent.id && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-surface p-3">
          <span className="flex-1 text-sm font-semibold">{opponent.name} offers a draw</span>
          <button
            className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            onClick={() => gameAction({ type: "draw", me, gameId: game.id, answer: "accept" })}
          >
            Accept
          </button>
          <button
            className="btn-secondary py-1 text-sm"
            onClick={() => gameAction({ type: "draw", me, gameId: game.id, answer: "decline" })}
          >
            Decline
          </button>
        </div>
      )}
      <div className="flex gap-1 border-b border-surface">
        {(["moves", "chat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-semibold capitalize ${
              tab === t ? "border-accent" : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {t}
            {t === "chat" && unread > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs text-white">{unread}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "moves" ? (
        <div className="max-h-48 min-h-0 flex-1 overflow-y-auto landscape:max-h-none">
          {moves.length > 0 && (
            <MoveList moves={moves} ply={ply} onSelect={(p) => game.result && setView(p)} newestFirst />
          )}
        </div>
      ) : (
        <Chat
          messages={messages}
          names={{ [game.white.id]: game.white.name, [game.black.id]: game.black.name }}
          me={me.id}
          onSend={sendChat}
        />
      )}
      {clockFor(color)}
      <div className="flex flex-wrap items-center gap-2 border-t border-surface pt-3">
        {playing ? (
          <>
            {game.drawBy === me.id ? (
              <span className="text-sm text-foreground/60">Draw offered…</span>
            ) : (
              <button
                className="btn-secondary text-sm"
                disabled={game.drawBy === opponent.id}
                onClick={() => gameAction({ type: "draw", me, gameId: game.id })}
              >
                Offer draw
              </button>
            )}
            <button
              className="btn-secondary ml-auto text-sm"
              onClick={() => gameAction({ type: "resign", me, gameId: game.id })}
            >
              Resign
            </button>
          </>
        ) : (
          <>
            {game.rematchBy === me.id ? (
              <span className="text-sm text-foreground/60">Rematch offered…</span>
            ) : (
              <button
                className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                onClick={() => gameAction({ type: "rematch", me, gameId: game.id })}
              >
                {game.rematchBy ? `Accept rematch` : "Rematch"}
              </button>
            )}
            <Link
              href={analysisHref({ moves, white: game.white.name, black: game.black.name, result: game.result!.score, you: color })}
              className="btn-secondary text-sm"
            >
              Analyze
            </Link>
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
        panel={
          <>
            {!active && (
              <p className="rounded bg-surface p-3 text-sm">
                Paused: you&apos;re offline to other players. Move the mouse or press a key to reconnect.
              </p>
            )}
            {gamePanel || lobbyPanel}
          </>
        }
      />
      {invite && !playing && (
        <Modal>
          <p className="text-lg">
            <b>{invite.from.name}</b> wants to play{" "}
            {invite.minutes ? `${invite.minutes} min` : "unlimited"}.
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
      {inviteTo && (
        <Modal>
          <p className="text-lg">
            Play <b>{inviteTo.name}</b>
          </p>
          <div className="flex gap-1">
            {TIME_CONTROLS.map((m) => (
              <button
                key={m ?? "unlimited"}
                onClick={() => setMinutes(m)}
                className={`flex-1 rounded px-2 py-2 text-sm font-semibold ${
                  minutes === m ? "bg-accent text-white" : "bg-surface hover:bg-surface-hover"
                }`}
              >
                {m ? `${m} min` : "∞"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                post({ type: "invite", me, to: inviteTo.id, minutes });
                setInviteTo(null);
              }}
            >
              Send invite
            </button>
            <button className="btn-secondary flex-1" onClick={() => setInviteTo(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Remaining time: m:ss, with tenths under 20 seconds.
function ClockFace({ ms, active }: { ms: number; active: boolean }) {
  const text =
    ms >= 20_000
      ? `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`
      : (Math.floor(ms / 100) / 10).toFixed(1);
  const low = ms < 10_000;
  return (
    <div
      className={`self-end rounded px-3 py-1 font-mono text-2xl font-bold tabular-nums ${
        active ? (low ? "bg-red-600 text-white" : "bg-foreground text-background") : "bg-surface text-foreground/60"
      }`}
    >
      {text}
    </div>
  );
}

// The game's chat: messages oldest first, kept scrolled to the newest, and a message field.
function Chat({
  messages,
  names,
  me,
  onSend,
}: {
  messages: ChatMessage[];
  names: Record<string, string>;
  me: string;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="flex max-h-48 min-h-0 flex-1 flex-col gap-2 landscape:max-h-none">
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto text-sm">
        {messages.length === 0 ? (
          <p className="text-foreground/50">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <p key={`${m.from}-${m.at}`} className="break-words">
              <b className={m.from === me ? "text-accent" : ""}>{names[m.from] ?? "?"}:</b> {m.text}
            </p>
          ))
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || sending) return;
          setSending(true);
          if (await onSend(text)) setText("");
          setSending(false);
        }}
      >
        <input
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="min-w-0 flex-1 rounded bg-surface px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button className="btn-secondary py-1.5 text-sm" disabled={!text.trim() || sending}>
          Send
        </button>
      </form>
    </div>
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
