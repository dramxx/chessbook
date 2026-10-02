import { Chess } from "chess.js";
import { epd, nearestName, type OpeningDb } from "@/lib/openings";
import { total, type Counts, type Explorer } from "@/lib/explorer";

const compact = new Intl.NumberFormat("en", { notation: "compact" });

// Win/draw/loss bar for master games.
function ResultBar({ counts }: { counts: Counts }) {
  const n = total(counts);
  const pct = (x: number) => (x / n) * 100;
  return (
    <div
      className="flex h-1.5 overflow-hidden rounded-full"
      title={`White ${pct(counts.white).toFixed(0)}% · Draw ${pct(counts.draws).toFixed(0)}% · Black ${pct(counts.black).toFixed(0)}%`}
    >
      <div className="bg-white" style={{ width: `${pct(counts.white)}%` }} />
      <div className="bg-neutral-500" style={{ width: `${pct(counts.draws)}%` }} />
      <div className="bg-neutral-900" style={{ width: `${pct(counts.black)}%` }} />
    </div>
  );
}

// Moves from the current position: book moves, each with the opening it reaches, merged with the
// moves master players chose (when `stats` is available), most played first.
// A move that only leads towards a named opening shows that opening dimmed.
export function ContinuationList({
  db,
  fen,
  stats,
  moveNumber,
  onPlay,
}: {
  db: OpeningDb;
  fen: string;
  stats: Explorer | null;
  moveNumber: number;
  onPlay: (san: string) => void;
}) {
  const white = fen.split(" ")[1] === "w";
  const book = db[epd(fen)]?.next ?? {};
  const played = new Map((stats?.moves ?? []).map((m) => [m.san, m]));

  const sans = [...new Set([...Object.keys(book), ...played.keys()])];
  const items = sans.map((san) => {
    let to = book[san];
    if (!to) {
      try {
        const chess = new Chess(fen);
        chess.move(san);
        to = epd(chess.fen());
      } catch {}
    }
    const named = to ? db[to]?.name : undefined;
    return { san, named, name: named ?? (to && db[to] ? nearestName(db, to) : undefined), counts: played.get(san) };
  });
  items.sort((a, b) => (b.counts ? total(b.counts) : 0) - (a.counts ? total(a.counts) : 0));

  if (items.length === 0) return <p className="text-sm text-foreground/60">Out of book: no named continuations.</p>;
  return (
    <div className="flex flex-col gap-2">
      {stats && total(stats) > 0 && (
        <p className="text-xs text-foreground/60">{compact.format(total(stats))} master games in this position</p>
      )}
      <ul className="flex flex-col gap-1">
        {items.map(({ san, named, name, counts }) => (
          <li key={san}>
            <button
              onClick={() => onPlay(san)}
              className="flex w-full flex-col gap-1 rounded bg-surface px-2 py-1.5 text-left hover:bg-surface-hover"
            >
              <span className="flex w-full items-baseline gap-2">
                <span className="shrink-0 font-mono font-semibold">
                  {moveNumber}.{white ? "" : ".."}
                  {san}
                </span>
                <span className={`text-sm ${named ? "" : "text-foreground/50"}`}>{name}</span>
                {counts && (
                  <span className="ml-auto shrink-0 font-mono text-xs text-foreground/60">
                    {compact.format(total(counts))}
                  </span>
                )}
              </span>
              {counts && total(counts) > 0 && <ResultBar counts={counts} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
