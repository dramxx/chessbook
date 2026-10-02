import { randomGame } from "@/lib/games";

// A random database game for Guess the Move. Long enough to have a middlegame to pick from.
export async function GET() {
  const game = await randomGame(40);
  if (!game) return Response.json({ error: "no game found" }, { status: 503 });
  return Response.json(game, { headers: { "Cache-Control": "no-store" } });
}
