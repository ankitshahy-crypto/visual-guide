/**
 * Browser + Capacitor share the same `/api/pipeline/*` paths.
 * On `npm run dev` they hit the Vite middleware.
 * Packaged iOS has no Node server — set `VITE_PIPELINE_API_URL` to a host
 * that implements the same routes, or leave empty (client fallbacks apply).
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
