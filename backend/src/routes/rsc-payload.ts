import type { AppContext } from "../lib/db.js";

/**
 * Serves Next.js RSC payloads (`/page.txt`, `/index.txt`) from static assets, except when the
 * browser opens one as a page.
 *
 * With `output: "export"`, Next.js 15 reloads the page when a fetched payload has a different
 * build ID, but it navigates to the payload URL (`/sparkle.txt?_rsc=...`) instead of the page,
 * so after every deploy a stale tab could end up showing raw RSC text. Redirect those to the page.
 */
export const rscPayloadHandler = async (c: AppContext) => {
  const url = new URL(c.req.url);
  const mode = c.req.header("sec-fetch-mode");
  const isNavigation =
    mode === "navigate" ||
    (mode === undefined && (c.req.header("accept") ?? "").includes("text/html"));
  if (!isNavigation) return c.env.ASSETS.fetch(c.req.raw);

  url.pathname = url.pathname.endsWith("/index.txt")
    ? url.pathname.slice(0, -"index.txt".length)
    : url.pathname.slice(0, -".txt".length);
  url.searchParams.delete("_rsc");
  return c.redirect(url.pathname + url.search + url.hash, 302);
};
