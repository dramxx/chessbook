// Chess news for the home page: articles from news sites' RSS feeds and tournaments Lichess is
// broadcasting. Runs on the server; a source that fails is left out rather than failing the page.

export type Article = { title: string; link: string; summary: string; date: number; source: string };
export type Broadcast = { name: string; round: string; url: string; image?: string; location?: string; live: boolean };

const FEEDS = [
  { source: "Chess.com", url: "https://www.chess.com/rss/news" },
  { source: "ChessBase", url: "https://en.chessbase.com/feed" },
  { source: "FIDE", url: "https://www.fide.com/rss" },
];

const REVALIDATE = 900; // seconds; matches the home page

function get(url: string): Promise<Response | null> {
  return fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Chessbook)" },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: REVALIDATE },
  })
    .then((r) => (r.ok ? r : null))
    .catch(() => null);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s: string): string {
  return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  // Chess.com encodes entities twice (&amp;#39;), so decode again after the first pass.
  return cdata ? cdata[1] : decode(decode(raw));
}

function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

async function feed(source: string, url: string): Promise<Article[]> {
  const res = await get(url);
  if (!res) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => {
      const summary = text(tag(item, "description"));
      return {
        title: text(tag(item, "title")),
        link: tag(item, "link"),
        summary: summary.length > 220 ? `${summary.slice(0, 220).replace(/\s+\S*$/, "")}…` : summary,
        date: Date.parse(tag(item, "pubDate")),
        source,
      };
    })
    .filter((a) => a.title && a.link.startsWith("https://") && !Number.isNaN(a.date));
}

export async function fetchArticles(limit = 30): Promise<Article[]> {
  const lists = await Promise.all(FEEDS.map((f) => feed(f.source, f.url)));
  return lists
    .flat()
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}

type LichessBroadcast = {
  tour: { name: string; url: string; image?: string; info?: { location?: string } };
  round: { name: string; url: string; ongoing?: boolean };
};

// Lichess lists active broadcasts most important first.
export async function fetchBroadcasts(limit = 8): Promise<Broadcast[]> {
  const res = await get("https://lichess.org/api/broadcast/top");
  const data = res && ((await res.json().catch(() => null)) as { active?: LichessBroadcast[] } | null);
  return (data?.active ?? []).slice(0, limit).map(({ tour, round }) => ({
    name: tour.name,
    round: round.name,
    url: round.url,
    image: tour.image,
    location: tour.info?.location,
    live: round.ongoing === true,
  }));
}
