import Link from "next/link";

const MODES = [
  {
    href: "/puzzles/rush",
    icon: "⚡",
    title: "Puzzle Rush",
    text: "Solve puzzles that get harder as you go. Three strikes and you're out.",
  },
  {
    href: "/puzzles/punish",
    icon: "⚔",
    title: "Punish it",
    text: "Real mistakes club players make in the opening, all the time. Find the move that makes them pay. Filter by course to practice your own openings.",
  },
  {
    href: "/puzzles/traps",
    icon: "🪤",
    title: "Opening traps",
    text: "Famous traps to set and to avoid, and the ones club players fall into most. Traps from your repertoire are marked.",
  },
  {
    href: "/puzzles/guess",
    icon: "♞",
    title: "Guess the Move",
    text: "Find Stockfish's best move in positions from master games. Three strikes and you're out.",
  },
];

export default function PuzzlesPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4">
      {MODES.map((m) => (
        <Link key={m.href} href={m.href} className="flex flex-col gap-2 rounded-lg bg-panel p-6 hover:bg-surface">
          <span className="text-4xl">{m.icon}</span>
          <span className="text-xl font-bold">{m.title}</span>
          <span className="text-sm text-foreground/60">{m.text}</span>
        </Link>
      ))}
    </main>
  );
}
