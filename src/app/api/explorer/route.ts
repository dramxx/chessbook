import { Chess } from "chess.js";

// Proxy for the Lichess masters opening explorer. Lichess requires a personal API token on every
// request, so it is added here and never reaches the browser.
const BASE = process.env.EXPLORER_URL ?? "https://explorer.lichess.ovh";

export async function GET(request: Request) {
  const fen = new URL(request.url).searchParams.get("fen") ?? "";
  try {
    new Chess(fen);
  } catch {
    return Response.json({ error: "invalid fen" }, { status: 400 });
  }

  const token = process.env.LICHESS_TOKEN;
  if (!token) return Response.json({ error: "explorer not configured" }, { status: 503 });

  const upstream = await fetch(`${BASE}/masters?fen=${encodeURIComponent(fen)}&moves=30&topGames=8`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!upstream) return Response.json({ error: "explorer unreachable" }, { status: 502 });
  if (!upstream.ok) return Response.json({ error: "explorer error" }, { status: upstream.status === 429 ? 429 : 502 });

  const data = await upstream.json();
  const { white, draws, black } = data;
  const moves = data.moves.map((m: { san: string; white: number; draws: number; black: number }) => ({
    san: m.san,
    white: m.white,
    draws: m.draws,
    black: m.black,
  }));
  // Master games never change, so let the CDN keep answers for a day.
  const topGames = data.topGames.map(
    (g: { id: string; winner: string | null; white: { name: string; rating: number }; black: { name: string; rating: number }; year: number }) => ({
      id: g.id,
      winner: g.winner,
      white: g.white,
      black: g.black,
      year: g.year,
    }),
  );
  return Response.json(
    { white, draws, black, moves, topGames },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
