import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The games database is read at runtime, so the file tracer can't see it.
  outputFileTracingIncludes: {
    "/games": ["./db/games.db"],
    "/games/\[id\]": ["./db/games.db"],
  },
};

export default nextConfig;
