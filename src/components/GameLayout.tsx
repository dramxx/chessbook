// Board takes 80% of the viewport height below the header (or the full width on narrow portrait screens),
// with the panel below it in portrait and beside it in landscape.
// In landscape the panel matches the squares only, excluding the 1.25rem coordinate row.
// `boardOverlay` is centered over the board. `scrollPanel` keeps the panel's scrollbar always
// shown, for panels whose length changes often (it would otherwise flicker in and out).
export function GameLayout({
  board,
  panel,
  boardOverlay,
  scrollPanel = false,
}: {
  board: React.ReactNode;
  panel: React.ReactNode;
  boardOverlay?: React.ReactNode;
  scrollPanel?: boolean;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-2">
      <div className="flex flex-col items-center gap-3 landscape:flex-row landscape:items-start">
        <section className="relative w-[min(100vw_-_1rem,calc(80dvh_-_var(--header-h)))] landscape:w-[min(calc(100dvh_-_var(--header-h)_-_2rem),100vw_-_19rem)] shrink-0">
          {board}
          {boardOverlay && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
              {boardOverlay}
            </div>
          )}
        </section>
        <aside className={`flex w-full max-w-[min(100vw_-_1rem,calc(80dvh_-_var(--header-h)))] flex-col gap-4 rounded-lg bg-panel p-4 landscape:w-72 landscape:h-[calc(min(calc(100dvh_-_var(--header-h)_-_2rem),100vw_-_19rem)_-_1.25rem)] ${
            scrollPanel ? "landscape:overflow-y-scroll" : "landscape:overflow-y-auto"
          }`}>
          {panel}
        </aside>
      </div>
    </main>
  );
}
