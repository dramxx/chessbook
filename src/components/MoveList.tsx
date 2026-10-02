// Clickable move list. `ply` is the number of moves played; the move at index ply - 1 is highlighted.
// `newestFirst` shows one row per move number, latest at the top.
export function MoveList({
  moves,
  ply,
  onSelect,
  newestFirst = false,
}: {
  moves: string[];
  ply: number;
  onSelect: (ply: number) => void;
  newestFirst?: boolean;
}) {
  if (moves.length === 0) return <p className="text-sm text-foreground/60">Make a move or pick an opening.</p>;
  const move = (i: number) => (
    <button
      onClick={() => onSelect(i + 1)}
      className={`rounded px-1.5 py-0.5 text-left ${i + 1 === ply ? "bg-accent text-white" : "hover:bg-surface-hover"}`}
    >
      {moves[i]}
    </button>
  );
  if (newestFirst) {
    const rows = Array.from({ length: Math.ceil(moves.length / 2) }, (_, r) => r).reverse();
    return (
      <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 font-mono text-sm">
        {rows.map((r) => (
          <div key={r} className="contents">
            <span className="self-center pr-1 text-right text-foreground/50">{r + 1}.</span>
            {move(2 * r)}
            {2 * r + 1 < moves.length ? move(2 * r + 1) : <span />}
          </div>
        ))}
      </div>
    );
  }
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
