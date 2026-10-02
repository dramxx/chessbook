# Chessbook

Chess openings, historical games and Puzzle Rush in one app: https://chessbook-amber.vercel.app

- **Openings:** play through named openings; the sidebar shows continuations, master-game stats and top games.
- **Games:** search ~864k over-the-board games (both players 2400+) by player, head-to-head
  ("Polgar, Kasparov"), event, opening, ECO, year and result, and replay them.
- **Puzzles:** Puzzle Rush survival mode: no clock, three strikes, rising difficulty.
- **Bot:** play Stockfish in your browser at 400–3200, with optional hint arrow and eval bar.

See [PLAN.md](PLAN.md) for architecture, data sources and status.

## Development

```bash
npm install
cp .env.example .env.local   # optional: LICHESS_TOKEN for explorer stats
npm run dev
```

The games database is not in the repo (license, size). Build it locally:

1. Download "OTB Elite – ELO > 2400" from [Lumbra's GigaBase](https://lumbrasgigabase.com/en/download-in-pgn-format-en/) and unpack the PGN into `data/`.
2. `node scripts/import-games.mjs data/<file>.pgn` (~10 min) writes `db/games.db`.

## Data and credits

- Openings: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0)
- Puzzles: [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0)
- Move statistics and master games: [Lichess Opening Explorer](https://lichess.org/api#tag/Opening-Explorer)
- Games: [Lumbra's GigaBase](https://lumbrasgigabase.com) (CC BY-NC-SA 4.0), non-commercial use only
- Engine: [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19 lite (GPLv3, `public/stockfish/Copying.txt`)
- Sounds: see `public/sounds/CREDITS.txt`
