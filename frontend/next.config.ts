import type { NextConfig } from "next";

const DEV_WORKER_ORIGIN = "http://localhost:8787";

const nextConfig: NextConfig = {
  // Served as static assets by the backend Worker (see backend/wrangler.jsonc)
  output: "export",
  images: { unoptimized: true },
  // Static export has no rewrites; in `next dev` proxy to `wrangler dev` so everything stays same-origin
  ...(process.env.NODE_ENV === "development" && {
    rewrites: async () => [
      { source: "/api/:path*", destination: `${DEV_WORKER_ORIGIN}/api/:path*` },
      { source: "/icons/:path*", destination: `${DEV_WORKER_ORIGIN}/icons/:path*` },
    ],
  }),
};

export default nextConfig;
