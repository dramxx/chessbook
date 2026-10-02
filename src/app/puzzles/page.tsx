import Link from "next/link";

const MODES = [
  {
    href: "/puzzles/rush",
    icon: "⚡",
    title: "Puzzle Rush",
    text: "Solve puzzles that get harder as you go. Three strikes and you're out.",
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
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4 sm:grid-cols-2">
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
