# Chessbook — Plan

A chess app with an **opening browser**, a **historical games browser** and **Puzzle Rush**,
live at https://chessbook-amber.vercel.app. Next: **play vs bots** and **play vs a friend**
(needs its own plan, see the end).

## Goals

1. **Openings:** browse named openings and play them out on a board. After every move, a sidebar
   lists the continuations, each with the opening it leads to and how often masters play it.
2. **Games:** search ~864k over-the-board games by player (or two players: head-to-head), event,
   opening, ECO, year and result, then replay any game.
3. **Puzzles:** Puzzle Rush survival mode (merged in from the former `puzzlerush` app).
4. **One app:** a shared header, board and layout for every section.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, chess.js (UI), chessops (import and
move encoding), react-chessboard, Node's built-in `node:sqlite`. Deployed on Vercel Hobby.

> Next 16 has breaking changes: read `node_modules/next/dist/docs/` before writing code (see
> `AGENTS.md`).

## Data sources

| Need | Source | Access |
|---|---|---|
| Opening names and lines | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings): 3,815 lines (eco, name, pgn) | CC0; `scripts/build-openings.mjs` → `public/openings.json` |
| Move stats per position, top games | Lichess Opening Explorer `explorer.lichess.ovh/masters` | Needs a personal API token on **every** request (`401` without one) |
| Single master game by id | `explorer.lichess.ovh/masters/pgn/{id}` | Works without a token |
| Historical games | [Lumbra's GigaBase OTB](https://lumbrasgigabase.com/en/download-in-pgn-format-en/), "OTB Elite (both players 2400+)": 131 MB .7z = 764 MB PGN, 863,790 games | **CC BY-NC-SA 4.0**: non-commercial only, with attribution (shown on `/games`). The download is a public Mega link (fetchable with `megajs`) into `data/`. Never offer the full dump for download: the database is not in git and not served as a file. |
| Puzzles | [Lichess puzzle database](https://database.lichess.org/#puzzles) | CC0; `scripts/build-puzzles.mjs` → `public/puzzles.json` (~5,000 puzzles, 400–3000) |

## Architecture

```
src/
  app/
    layout.tsx              root layout: <Header/> + page
    page.tsx                redirects to /openings
    openings/page.tsx       opening tree + board + continuation sidebar + top games
    games/page.tsx          search form (GET) + results table, server-rendered from SQLite
    games/[id]/page.tsx     replay of a database game (?ply=N opens at that move)
    games/masters/[id]/     replay of a Lichess masters game (openings sidebar "Top games")
    puzzles/page.tsx        Puzzle Rush survival mode
    puzzles/[id]/page.tsx   retry one puzzle (unranked, hints)
    api/explorer/route.ts   proxy to the Lichess explorer; adds the token server-side, CDN-cached
  components/
    Header.tsx              app header + nav (Play disabled until it exists)
    Board.tsx               react-chessboard wrapper: moves, premoves, promotion, arrows
    GameLayout.tsx          board + side panel, sized below the header
    MoveList.tsx            clickable SAN list with current-ply highlight
    ContinuationList.tsx    sidebar: next moves with opening names and stats
    Replay.tsx              read-only game replay (opening name, moves, copy PGN, ←/→ keys)
    PuzzlePlayer.tsx        plays one puzzle on the board
  lib/
    openings.ts             load openings.json, look up by position
    explorer.ts             client fetch + cache for /api/explorer
    games.ts                search and load games from db/games.db (server only)
    movecodec.mjs           one byte per move: index into the sorted legal moves (chessops)
    puzzles.ts, best.ts     puzzle loading/picking; high score in localStorage
    sounds.ts               move and countdown sounds
scripts/
  build-openings.mjs        TSV → public/openings.json
  build-puzzles.mjs         Lichess puzzle dump → public/puzzles.json
  import-games.mjs          PGN → db/games.db + <100 MB parts
  join-db.mjs               prebuild: joins the parts back into db/games.db
db/                         games.db and games.db.partN (git-ignored, built locally)
data/                       downloaded PGN (git-ignored)
```

### Openings

- `build-openings.mjs` replays each TSV line and writes `public/openings.json`, keyed by
  **position** (first four FEN fields, so transpositions match):
  `{ [epd]: { name, eco, next: { [san]: epd } } }`.
- The page shows the name of the current position (or the last named one, "out of book"), the
  continuations with the opening each reaches, and a "Games in this opening" link to `/games`.
- `/api/explorer` adds master-game counts and W/D/L per move plus the top games. Without a token
  or when Lichess fails, the sidebar still works from the JSON alone.

### Games: SQLite file shipped with the app

The games are read-only, so they live in a SQLite file deployed with the app instead of a hosted
database: no account, no connection string, no limits beyond Vercel's.

- **Database:** `db/games.db` (192 MB), read with `node:sqlite` from server components (`/games`,
  `/games/[id]`). `next.config.ts` adds it to those routes' file traces.
- **Tables:** `players(id, name)`, `events(id, name, site)`, `openings(id, name, eco)`,
  `games(id, white, black, white_elo, black_elo, event, date, year, round, result, eco, opening,
  plies)`, `moves(id, data)`. Indexes on `white`, `black`, `event`, `year`, `eco`, `opening`.
- **Search:** name, event and opening are `LIKE '%…%'` on the small lookup tables (3+ characters,
  shorter fragments are too slow). "Polgar, Kasparov" in the player field finds games between the
  two, either color. Newest first, 50 per page.
- **Opening per game:** the deepest named position (`public/openings.json`) among the game's first
  40 plies.
- **Moves:** one byte per move, the index of the move among the legal moves sorted by
  (from, to, promotion) (`src/lib/movecodec.mjs`). Moves take 71 MB; decoding a game takes < 1 ms.
- **Rebuild:** `node scripts/import-games.mjs data/<file>.pgn` (~10 min; rebuilds from scratch).
- **Vercel rejects uploaded files over 100 MB:** the import also writes 95 MB `games.db.partN`
  chunks; only those are uploaded (`.vercelignore`), and `npm run build` joins them (`prebuild`).
- **Deploy from the CLI only** (`vercel deploy --prod`): the database is not in git, so a
  Git-triggered Vercel build would have no games.

### Puzzles

- Survival mode: no clock, three strikes, puzzles get harder (400 + 45 per puzzle).
- Missed puzzles open at `/puzzles/[id]` for an unranked retry with hints.
- High score is kept in `localStorage` (`puzzlerush.best`). Scores saved on the old
  puzzlerush site did not carry over (storage is per site).

## Cost: must stay $0

Hard requirement: the project must never generate costs.

- **Vercel Hobby:** $0, hard caps, no overage purchases. Non-commercial use only; this matches the
  GigaBase license, so no ads, subscriptions or paid features. Never add a card or upgrade.
- **Lichess:** free token, no billing.
- **No database service:** the games are a SQLite file in the deployment.
- **Sizes to watch:** Hobby rejects uploaded files over 100 MB (hence the db parts) and caps
  function CPU (4 h/month), so keep queries cheap.
- **No custom domain** (costs money).
- Figures come from the vendors' pricing pages on 2026-10-02 and can change.

## Status

| Phase | State |
|---|---|
| 1–4 | Done: scaffold, `openings.json`, openings page, explorer proxy with stats and top games. |
| 5 | Done: Elite PGN imported (863,774 games, 16 skipped as illegal). |
| 6 | Done: games search (players, head-to-head, event, opening, ECO, years, result) and replay. Search 10–100 ms locally. |
| 7 | Done: puzzlerush merged into `/puzzles`; old repo and Vercel project deleted. |
| Deploy | Vercel project `chessbook` (Hobby), deployed with `vercel deploy --prod` from the CLI. `LICHESS_TOKEN` set for Production and Preview. |
| Repo | Public: https://github.com/dramxx/chessbook (database excluded). |

## Next: play vs bots and play vs a friend

Needs its own plan before work starts. Known constraints:

- `/play`: reuse `Board` (premoves already supported), `MoveList` and the header.
- **vs bots:** an engine in the browser (e.g. Stockfish WASM in a Web Worker) costs nothing to run;
  strength levels via depth/skill settings.
- **vs a friend:** create a game, share a link, the friend joins; moves validated on both ends and
  on the server. Needs realtime transport (WebSockets on Vercel Functions, or a hosted realtime
  service) and a writable store for game state (the games SQLite file is read-only). Every option
  must stay $0 with no card.

## Owner notes

- **Lichess token:** in `.env.local` (git-ignored) and in Vercel env. It was once pasted into a
  chat; replace it any time at https://lichess.org/account/oauth/token (no scopes), then update
  `.env.local` and the Vercel env var.
- `data/` holds the downloaded PGN (764 MB) and `.7z` (131 MB); only the PGN is needed for a
  re-import.
