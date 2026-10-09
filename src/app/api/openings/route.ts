import { openingsWithGames } from "@/lib/games";

// Opening names that have games in the database, so the openings page can hide links to empty searches.
export async function GET() {
  // The games database only changes on a re-import, so let the CDN keep the answer for a day.
  return Response.json(await openingsWithGames(), {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
