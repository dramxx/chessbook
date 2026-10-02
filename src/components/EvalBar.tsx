// Vertical evaluation bar. `cp`/`mate` are from White's point of view; White's share is at the
// bottom when `orientation` is white. `text` replaces the score shown, e.g. "1-0" after checkmate.
export function EvalBar({
  cp,
  mate,
  orientation,
  text,
}: {
  cp?: number;
  mate?: number;
  orientation: "white" | "black";
  text?: string;
}) {
  // Lichess' win-chance curve.
  const white =
    mate !== undefined ? (mate > 0 ? 100 : 0) : cp !== undefined ? 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1) : 50;
  const label =
    text ?? (mate !== undefined ? `M${Math.abs(mate)}` : cp !== undefined ? (Math.abs(cp) / 100).toFixed(1) : "");
  const whiteAhead = mate !== undefined ? mate > 0 : (cp ?? 0) >= 0;
  const flip = orientation === "black";

  return (
    <div
      className={`relative w-3 shrink-0 overflow-hidden rounded-sm bg-neutral-800 sm:w-4 ${flip ? "rotate-180" : ""}`}
      title={text ?? (label && `${whiteAhead ? "+" : "−"}${label}`)}
    >
      <div className="absolute inset-x-0 bottom-0 bg-neutral-100 transition-[height] duration-300" style={{ height: `${white}%` }} />
      <span
        className={`absolute inset-x-0 text-center text-[0.5rem] font-bold sm:text-[0.6rem] ${flip ? "rotate-180" : ""} ${
          whiteAhead ? "bottom-0.5 text-neutral-800" : "top-0.5 text-neutral-100"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
