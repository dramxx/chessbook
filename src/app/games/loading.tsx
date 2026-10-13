import { Spinner } from "@/components/Spinner";

// Shown while a game (or the games list) is fetched from the database or Lichess.
export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Spinner />
    </main>
  );
}
