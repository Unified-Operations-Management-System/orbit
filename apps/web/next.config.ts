import path from "node:path";
import type { NextConfig } from "next";

// Where the Go API lives. Server-side code calls it directly; the browser goes
// through the /api rewrite below, so there's no CORS and cookies just work.
const API_URL = process.env.API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  // Self-contained server bundle for Docker.
  output: "standalone",
  // In a monorepo, trace files from the repo root so workspace packages are included.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),

  // The api-client package ships TypeScript source; let Next compile it.
  transpilePackages: ["@orbit/api-client", "@orbit/design-tokens"],

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },

  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
