// Clickable move list. `ply` is the number of moves played; the move at index ply - 1 is highlighted.
export function MoveList({
  moves,
  ply,
  onSelect,
}: {
  moves: string[];
  ply: number;
  onSelect: (ply: number) => void;
}) {
  if (moves.length === 0) return <p className="text-sm text-foreground/60">Make a move or pick an opening.</p>;
  return (
    <div className="flex flex-wrap gap-x-0.5 gap-y-1 font-mono text-sm">
      {moves.map((san, i) => (
        <span key={i} className="flex items-center">
          {i % 2 === 0 && <span className="mr-1 ml-1.5 text-foreground/50">{i / 2 + 1}.</span>}
          <button
            onClick={() => onSelect(i + 1)}
            className={`rounded px-1.5 py-0.5 ${i + 1 === ply ? "bg-accent text-white" : "hover:bg-surface-hover"}`}
          >
            {san}
          </button>
        </span>
      ))}
    </div>
  );
}
