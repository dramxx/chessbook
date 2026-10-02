"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { EvalBar } from "@/components/EvalBar";
import { GameLayout } from "@/components/GameLayout";
import { MoveList } from "@/components/MoveList";
import { botLevel, Engine, type Info } from "@/lib/engine";
import { epd, loadOpenings } from "@/lib/openings";
import { playMoveSound } from "@/lib/sounds";

const GAME_KEY = "chessbook.bot";
const SETTINGS_KEY = "chessbook.bot.settings";
const LAST_MOVE = "rgba(255,255,51,.4)";
const PREMOVE = "rgba(244,42,50,.45)";
const HINT = "rgba(80,160,255,.8)";
const MIN_THINK_MS = 500;

type Color = "white" | "black";
type Game = {
  moves: string[]; // SAN from the start position, including moves set up from the openings page
  color: Color;
  rating: number;
};
type Settings = { hint: boolean; evalBar: boolean };

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function replay(moves: string[]) {
  const chess = new Chess();
  for (const san of moves) chess.move(san);
  return chess;
}

export default function BotPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [setup, setSetup] = useState<{ moves: string[]; color: Color | "random"; rating: number }>({
    moves: [],
    color: "white",
    rating: 1500,
  });
  const [settings, setSettings] = useState<Settings>({ hint: false, evalBar: false });
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  // Draw offer: pending, or declined at this many moves (shown until the next move).
  const [draw, setDraw] = useState<{ pending: boolean; declinedAt: number | null }>({ pending: false, declinedAt: null });
  const [analysis, setAnalysis] = useState<{ fen: string; info: Info } | null>(null);
  const [named, setNamed] = useState<{ moves: string; name: string | null } | null>(null);

  const bot = useRef<Engine | null>(null);
  const analyst = useRef<Engine | null>(null);

  // Restore the saved game and settings; a ?moves= link from the openings page starts a new setup.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromOpenings = params.get("moves");
    const saved = load<Game>(GAME_KEY);
    const savedSettings = load<Settings>(SETTINGS_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage after hydration */
    if (savedSettings) setSettings(savedSettings);
    if (fromOpenings !== null) {
      const moves = fromOpenings.split(" ").filter(Boolean);
      try {
        replay(moves);
        setSetup((s) => ({ ...s, moves, rating: saved?.rating ?? s.rating }));
      } catch {}
      window.history.replaceState(null, "", window.location.pathname);
    } else if (saved && !replay(saved.moves).isGameOver()) {
      setGame(saved);
      setSetup((s) => ({ ...s, rating: saved.rating, color: saved.color }));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    bot.current = new Engine();
    analyst.current = new Engine();
    return () => {
      bot.current?.terminate();
      analyst.current?.terminate();
    };
  }, []);

  useEffect(() => {
    save(GAME_KEY, game);
  }, [game]);
  useEffect(() => save(SETTINGS_KEY, settings), [settings]);

  // Name of the opening a setup from the openings page starts in.
  useEffect(() => {
    if (!setup.moves.length) return;
    loadOpenings().then((db) => {
      const chess = new Chess();
      let name: string | null = null;
      for (const san of setup.moves) {
        chess.move(san);
        name = db[epd(chess.fen())]?.name ?? name;
      }
      setNamed({ moves: setup.moves.join(" "), name });
    });
  }, [setup.moves]);
  const setupName = named?.moves === setup.moves.join(" ") ? named.name : null;

  const moves = useMemo(() => game?.moves ?? setup.moves, [game, setup.moves]);
  const positions = useMemo(() => {
    const chess = new Chess();
    const out = [{ fen: chess.fen(), last: null as { from: string; to: string } | null }];
    for (const san of moves) {
      const m = chess.move(san);
      out.push({ fen: chess.fen(), last: { from: m.from, to: m.to } });
    }
    return out;
  }, [moves]);
  const ply = moves.length;
  const { fen, last } = positions[ply];
  const turn: Color = fen.split(" ")[1] === "w" ? "white" : "black";
  const playing = game !== null;
  const myTurn = playing && turn === game.color;

  function start() {
    const color = setup.color === "random" ? (Math.random() < 0.5 ? "white" : "black") : setup.color;
    setGame({ moves: setup.moves, color, rating: setup.rating });
    setPremove(null);
  }

  // Plays a move; a finished game goes straight back to the setup screen.
  function addMove(g: Game, san: string) {
    const chess = replay(g.moves);
    const m = chess.move(san);
    playMoveSound(m);
    setGame(chess.isGameOver() ? null : { ...g, moves: [...g.moves, m.san] });
  }

  function onMove(from: string, to: string, promotion?: string) {
    if (!game || !myTurn) return;
    try {
      const san = new Chess(fen).move({ from, to, promotion }).san;
      setPremove(null);
      addMove(game, san);
    } catch {}
  }

  // Bot's turn: search at the chosen strength (or play a random move), never faster than MIN_THINK_MS.
  useEffect(() => {
    if (!game || turn === game.color || !bot.current) return;
    const engine = bot.current;
    const level = botLevel(game.rating);
    const started = Date.now();
    let cancelled = false;
    let search: ReturnType<Engine["search"]> | null = null;
    setThinking(true);
    (async () => {
      let uci: string | null;
      const chess = new Chess(fen);
      if (Math.random() < level.randomMove) {
        const all = chess.moves({ verbose: true });
        const m = all[Math.floor(Math.random() * all.length)];
        uci = m.from + m.to + (m.promotion ?? "");
      } else {
        await engine.setOptions(level.options);
        search = engine.search(fen, level.go);
        uci = await search.result;
      }
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_THINK_MS - (Date.now() - started))));
      if (cancelled || !uci) return;
      const san = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
      setThinking(false);
      addMove(game, san);
    })();
    return () => {
      cancelled = true;
      search?.stop();
      setThinking(false);
    };
  }, [game, fen, turn]);

  // A premove queued during the bot's turn is played once it's legal (auto-queen).
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

  // Full-strength analysis of the shown position, for the eval bar and the hint.
  const analysing = game !== null && (settings.evalBar || (settings.hint && myTurn));
  useEffect(() => {
    if (!analysing || !analyst.current) return;
    const search = analyst.current.search(fen, "depth 18", (info) => setAnalysis({ fen, info }));
    return () => search.stop();
  }, [analysing, fen]);
  const info = analysis?.fen === fen ? analysis.info : null;
  // Engine scores are for the side to move; the bar wants White's view.
  const sign = turn === "white" ? 1 : -1;

  // Stockfish accepts a draw when it isn't better than +0.3 pawns, judged at full strength.
  async function offerDraw() {
    if (!game || !analyst.current) return;
    const at = game.moves.length;
    const botToMove = turn !== game.color;
    setDraw({ pending: true, declinedAt: null });
    let judged = info && info.depth >= 12 ? info : null;
    if (!judged) {
      const latest: { info: Info | null } = { info: null };
      await analyst.current.search(fen, "depth 12", (i) => (latest.info = i)).result;
      judged = latest.info;
    }
    const score = judged?.mate !== undefined ? Math.sign(judged.mate) * 100_000 : (judged?.cp ?? 0);
    const accept = (botToMove ? score : -score) <= 30;
    setDraw({ pending: false, declinedAt: accept ? null : at });
    // Accepted: the game ends, back to the setup screen (unless a move happened meanwhile).
    if (accept) setGame((g) => (g && g.moves.length === at ? null : g));
  }

  const highlights: Record<string, string> = last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {};
  if (premove) highlights[premove.from] = highlights[premove.to] = PREMOVE;
  const arrows: Arrow[] =
    settings.hint && myTurn && info?.pv[0]
      ? [{ startSquare: info.pv[0].slice(0, 2), endSquare: info.pv[0].slice(2, 4), color: HINT }]
      : [];

  const orientation: Color = game?.color ?? (setup.color === "black" ? "black" : "white");
  const toggle = (key: keyof Settings, label: string) => (
    <button
      role="switch"
      aria-checked={settings[key]}
      onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
      className="flex items-center gap-2 text-sm whitespace-nowrap"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${settings[key] ? "bg-accent" : "bg-surface-hover"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            settings[key] ? "translate-x-4" : ""
          }`}
        />
      </span>
      {label}
    </button>
  );

  const ratingSlider = (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        Stockfish rating <b className="font-mono">{setup.rating === 3200 ? "3200 (max)" : setup.rating}</b>
      </span>
      <input
        type="range"
        min={400}
        max={3200}
        step={100}
        value={setup.rating}
        onChange={(e) => setSetup({ ...setup, rating: Number(e.target.value) })}
        className="accent-[var(--accent)]"
      />
    </label>
  );

  const panel = !game ? (
    <>
      <h1 className="text-xl font-bold">Play vs Stockfish</h1>
      {setup.moves.length > 0 && (
        <p className="text-sm text-foreground/60">
          Starting from {setupName ?? "the openings page"} ({setup.moves.length} moves).{" "}
          <button className="underline" onClick={() => setSetup({ ...setup, moves: [] })}>
            Use the normal start
          </button>
        </p>
      )}
      {ratingSlider}
      <div className="flex gap-1">
        {(["white", "random", "black"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setSetup({ ...setup, color: c })}
            className={`flex-1 rounded px-2 py-1.5 text-sm font-semibold capitalize ${
              setup.color === c ? "bg-accent text-white" : "bg-surface hover:bg-surface-hover"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={start}>
        Start
      </button>
      <div className="flex gap-4">
        {toggle("hint", "Hint")}
        {toggle("evalBar", "Eval bar")}
      </div>
      <p className="text-xs text-foreground/50">
        Ratings are approximate. Stockfish 19 lite runs in your browser.
      </p>
    </>
  ) : (
    <>
      <div>
        <h1 className="text-xl font-bold">Stockfish {game.rating}</h1>
        <p className="text-sm text-foreground/60">
          You play {game.color} · {thinking ? "Stockfish is thinking…" : myTurn ? "Your move" : ""}
        </p>
      </div>
      {/* Only the moves scroll; the title stays on top and the controls at the bottom. */}
      <div className="max-h-48 min-h-0 flex-1 overflow-y-auto landscape:max-h-none">
        {moves.length > 0 && <MoveList moves={moves} ply={ply} onSelect={() => {}} newestFirst />}
      </div>
      {draw.declinedAt === moves.length && <p className="text-sm text-foreground/60">Stockfish declines the draw.</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface pt-3">
        {toggle("hint", "Hint")}
        {toggle("evalBar", "Eval bar")}
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary text-sm" disabled={draw.pending} onClick={offerDraw}>
            {draw.pending ? "Draw offered…" : "Offer draw"}
          </button>
          <button className="btn-secondary text-sm" onClick={() => setGame(null)}>
            Resign
          </button>
        </div>
      </div>
    </>
  );

  return (
    <GameLayout
      board={
        <div className="flex gap-1">
          {/* Always takes its space, so turning it on doesn't resize the board. Bottom margin: the
              board's coordinate row. */}
          <div
            className={`mb-5 flex transition-opacity ${settings.evalBar && game ? "" : "invisible opacity-0"}`}
            aria-hidden={!(settings.evalBar && game)}
          >
            <EvalBar
              cp={info?.cp !== undefined ? info.cp * sign : undefined}
              mate={info?.mate !== undefined ? info.mate * sign : undefined}
              orientation={orientation}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Board
              fen={fen}
              orientation={orientation}
              canMove={myTurn && !premove}
              onMove={onMove}
              canPremove={playing && !myTurn}
              onPremove={setPremove}
              highlights={highlights}
              arrows={arrows}
            />
          </div>
        </div>
      }
      panel={panel}
    />
  );
}
