import { notFound } from "next/navigation";
import { Replay } from "@/components/Replay";
import { getGame } from "@/lib/games";

export default async function GamePage({ params, searchParams }: PageProps<"/games/[id]">) {
  const id = Number((await params).id);
  const ply = Number((await searchParams).ply) || 0;
  const game = Number.isInteger(id) && id > 0 ? await getGame(id) : null;
  if (!game) notFound();
  return <Replay game={game} initialPly={ply} />;
}
