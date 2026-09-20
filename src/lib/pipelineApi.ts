/**
 * Browser + Capacitor share the same `/api/pipeline/*` paths.
 * On `npm run dev` they hit the Vite middleware.
 * Packaged iOS has no Node server — set `VITE_PIPELINE_API_URL` to a host
 * that implements the same routes, or leave empty (client fallbacks apply).
 * GitHub Pages is static `dist/` only — these URLs 404 / return HTML.
 */
export function pipelineApiBase(): string {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const v = env?.VITE_PIPELINE_API_URL?.trim();
    if (!v) return "";
    return v.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function pipelineApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${pipelineApiBase()}${p}`;
}

/** Timed fetch that treats HTML 404 pages (GitHub Pages) as a miss. */
export async function fetchPipelineJson(
  path: string,
  init?: RequestInit,
  timeoutMs = 4000,
): Promise<unknown | null> {
  const ctrl = new AbortController();
  const outer = init?.signal;
  if (outer?.aborted) return null;
  const onAbort = () => ctrl.abort();
  outer?.addEventListener("abort", onAbort, { once: true });
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(pipelineApiUrl(path), { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !/json/i.test(ct)) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
    outer?.removeEventListener("abort", onAbort);
  }
}
