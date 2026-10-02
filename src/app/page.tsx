import { fetchArticles, fetchBroadcasts } from "@/lib/news";

// Rebuilt at most every 15 minutes, so visitors don't each hit the news sites.
export const revalidate = 900;

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function Home() {
  const [broadcasts, articles] = await Promise.all([fetchBroadcasts(), fetchArticles()]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4">
      {broadcasts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold tracking-wide text-foreground/60 uppercase">Tournaments on Lichess</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {broadcasts.map((b) => (
              <a
                key={b.url}
                href={b.url}
                target="_blank"
                rel="noreferrer"
                className="flex w-56 shrink-0 flex-col overflow-hidden rounded-lg bg-panel hover:bg-surface"
              >
                {b.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote thumbnail, already sized by Lichess
                  <img src={b.image} alt="" className="aspect-[2/1] w-full object-cover" />
                )}
                <div className="flex flex-col gap-1 p-3">
                  <span className="line-clamp-2 text-sm font-semibold">{b.name}</span>
                  <span className="flex items-center gap-2 text-xs text-foreground/60">
                    {b.live && <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold text-white">LIVE</span>}
                    {b.round}
                  </span>
                  {b.location && <span className="truncate text-xs text-foreground/40">{b.location}</span>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold tracking-wide text-foreground/60 uppercase">News</h2>
        {articles.length === 0 ? (
          <p className="rounded-lg bg-panel p-4 text-foreground/60">News is unavailable right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {articles.map((a) => (
              <li key={a.link}>
                <a
                  href={a.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-1 rounded-lg bg-panel p-4 hover:bg-surface"
                >
                  <span className="text-xs text-foreground/50">
                    <span className="font-semibold text-accent">{a.source}</span> · {day.format(a.date)}
                  </span>
                  <span className="font-semibold">{a.title}</span>
                  {a.summary && <span className="text-sm text-foreground/70">{a.summary}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
