import Link from "next/link";
import { searchGames, type Search } from "@/lib/games";

const RESULTS = ["1-0", "0-1", "1/2-1/2"];

// Search form (a plain GET form, so the URL holds the search) and one page of results, newest first.
export default async function GamesPage({ searchParams }: PageProps<"/games">) {
  const sp = await searchParams;
  const str = (k: string) => {
    const v = sp[k];
    return (typeof v === "string" ? v.trim().slice(0, 100) : "") || undefined;
  };
  const int = (k: string) => {
    const n = Number(str(k));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  // Shorter name fragments match too many players or events to search quickly.
  const name = (k: string) => ((str(k)?.length ?? 0) >= 3 ? str(k) : undefined);
  // "Polgar, Kasparov": games between the two. Names are stored "Last, First", so search by surname.
  const players = (str("player") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)
    .slice(0, 2);
  const eco = str("eco");
  const search: Search = {
    players: players.length ? players : undefined,
    event: name("event"),
    opening: name("opening"),
    eco: eco && /^[A-Ea-e]\d{0,2}$/.test(eco) ? eco : undefined,
    from: int("from"),
    to: int("to"),
    result: RESULTS.includes(str("result") ?? "") ? str("result") : undefined,
    page: int("page"),
  };
  const page = search.page ?? 0;
  const { games, more } = await searchGames(search);

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (v === undefined || k === "page") continue;
      q.set(k === "players" ? "player" : k, k === "players" ? players.join(", ") : String(v));
    }
    if (p > 0) q.set("page", String(p));
    return `/games?${q}`;
  };
  const input = "rounded bg-surface px-2 py-1.5 text-base outline-none focus:ring-2 focus:ring-accent sm:text-sm";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <form className="flex flex-wrap items-end gap-2 rounded-lg bg-panel p-4">
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Player
          <input
            name="player"
            minLength={3}
            defaultValue={players.join(", ")}
            placeholder="Polgar, Kasparov"
            title="One surname, or two separated by a comma for games between them"
            className={`${input} w-52`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Event
          <input name="event" minLength={3} defaultValue={search.event} placeholder="Olympiad" className={`${input} w-44`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Opening
          <input name="opening" minLength={3} defaultValue={search.opening} placeholder="Najdorf" className={`${input} w-44`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          ECO
          <input name="eco" defaultValue={search.eco} placeholder="B90" className={`${input} w-16`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Years
          <span className="flex items-center gap-1">
            <input name="from" type="number" defaultValue={search.from} placeholder="from" className={`${input} w-20`} />
            –
            <input name="to" type="number" defaultValue={search.to} placeholder="to" className={`${input} w-20`} />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/60">
          Result
          <select name="result" defaultValue={search.result ?? ""} className={input}>
            <option value="">Any</option>
            {RESULTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="btn-secondary">Search</button>
      </form>

      {games.length === 0 ? (
        <p className="text-sm text-foreground/60">No games found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-foreground/60">
              <tr>
                <th className="px-3 py-2 font-semibold">White</th>
                <th className="px-3 py-2 font-semibold">Black</th>
                <th className="px-3 py-2 font-semibold">Result</th>
                <th className="px-3 py-2 font-semibold">Moves</th>
                <th className="px-3 py-2 font-semibold">Event</th>
                <th className="px-3 py-2 font-semibold">Year</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                // Every cell links to the game, so the whole row is clickable; only the first is a tab stop.
                // (An overlay link stretched over a `relative` row escapes the row on some mobile browsers
                // and covers the whole page, search form included.)
                const cell = (className: string, children: React.ReactNode, first = false) => (
                  <td>
                    <Link href={`/games/${g.id}`} tabIndex={first ? undefined : -1} className={`block px-3 py-1.5 ${className}`}>
                      {children}
                    </Link>
                  </td>
                );
                return (
                  <tr key={g.id} className="border-t border-surface hover:bg-surface-hover">
                    {cell(
                      "whitespace-nowrap",
                      <>
                        {g.white}
                        {g.whiteElo && <span className="ml-1 text-foreground/50">{g.whiteElo}</span>}
                      </>,
                      true,
                    )}
                    {cell(
                      "whitespace-nowrap",
                      <>
                        {g.black}
                        {g.blackElo && <span className="ml-1 text-foreground/50">{g.blackElo}</span>}
                      </>,
                    )}
                    {cell("font-mono whitespace-nowrap", g.result.replace("1/2", "½"))}
                    {cell("font-mono", Math.ceil(g.plies / 2))}
                    {cell("max-w-96 truncate", <span title={g.event ?? undefined}>{g.event}</span>)}
                    {cell("font-mono", g.year)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(page > 0 || more) && (
        <nav className="flex items-center gap-2 text-sm">
          {page > 0 && (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              ◀ Newer
            </Link>
          )}
          <span className="text-foreground/60">Page {page + 1}</span>
          {more && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Older ▶
            </Link>
          )}
        </nav>
      )}

      <p className="text-xs text-foreground/50">
        Games from{" "}
        <a href="https://lumbrasgigabase.com" className="underline">
          Lumbra&apos;s GigaBase
        </a>{" "}
        (OTB Elite, both players 2400+), CC BY-NC-SA 4.0.
      </p>
    </main>
  );
}
