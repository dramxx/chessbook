import { notFound } from "next/navigation";
import { Chess } from "chess.js";
import { Replay } from "@/components/Replay";

// A Lichess masters game (from the openings sidebar's top games), fetched as PGN by id.
export default async function MastersGamePage({ params, searchParams }: PageProps<"/games/masters/[id]">) {
  const { id } = await params;
  const ply = Number((await searchParams).ply) || 0;
  if (!/^\w{8}$/.test(id)) notFound();
  const res = await fetch(`https://explorer.lichess.ovh/masters/pgn/${id}`, {
    headers: process.env.LICHESS_TOKEN ? { Authorization: `Bearer ${process.env.LICHESS_TOKEN}` } : {},
  }).catch(() => null);
  if (!res?.ok) notFound();
  const chess = new Chess();
  chess.loadPgn(await res.text());
  const h = chess.getHeaders();
  const elo = (v?: string) => (Number(v) > 0 ? Number(v) : null);
  return (
    <Replay
      initialPly={ply}
      game={{
        white: h.White ?? "?",
        black: h.Black ?? "?",
        whiteElo: elo(h.WhiteElo),
        blackElo: elo(h.BlackElo),
        event: h.Event ?? null,
        site: h.Site ?? null,
        date: h.Date ?? null,
        round: h.Round ?? null,
        result: h.Result ?? "*",
        eco: h.ECO ?? null,
        moves: chess.history(),
      }}
    />
  );
}
