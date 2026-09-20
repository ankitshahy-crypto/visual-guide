/** Parse `#/path?query` hash routes (GitHub Pages SPA). */

export function splitHash(hash: string): { path: string; params: URLSearchParams } {
  const raw = hash.replace(/^#/, "") || "/";
  const q = raw.indexOf("?");
  const pathRaw = q >= 0 ? raw.slice(0, q) : raw;
  const path = pathRaw.endsWith("/") && pathRaw.length > 1 ? pathRaw.slice(0, -1) : (pathRaw || "/");
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
  return { path, params };
}

/** `#/new?fixture=1` (also `true` / bare `?fixture`). */
export function isFixtureQuery(params: URLSearchParams): boolean {
  if (!params.has("fixture")) return false;
  const v = (params.get("fixture") ?? "1").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "";
}
