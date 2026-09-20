import { fetchPipelineJson, pipelineApiBase } from "./pipelineApi";
import { forcePipelineFixture } from "../pipeline/env";

/** Shown when Analyzing would otherwise spin on a static host with no `/api/pipeline`. */
export const LIVE_PROCESSING_NEEDS_SERVER =
  "Live processing needs a server. Use fixture pages on this preview, or run locally with API.";

export function hostnameLooksStatic(hostname: string): boolean {
  return hostname.trim().toLowerCase().endsWith(".github.io");
}

/**
 * GitHub Pages (and any `*.github.io`) ships `dist/` only — no Vite `/api/pipeline/*`
 * unless `VITE_PIPELINE_API_URL` points at a real host.
 */
export function looksLikeStaticHost(
  hostname = typeof location !== "undefined" ? location.hostname : "",
  apiBase = pipelineApiBase(),
): boolean {
  if (apiBase) return false;
  return hostnameLooksStatic(hostname);
}

let probeCache: boolean | undefined;
let probeInflight: Promise<boolean> | undefined;

export function resetPipelineProbeForTests(): void {
  probeCache = undefined;
  probeInflight = undefined;
}

async function probePipeline(timeoutMs: number): Promise<boolean> {
  const json = await fetchPipelineJson(
    "/api/pipeline/tts/status",
    { method: "GET", headers: { Accept: "application/json" } },
    timeoutMs,
  );
  return json != null && typeof json === "object";
}

/** True when this origin serves the Vite pipeline middleware (or a configured remote). */
export async function pipelineAvailable(timeoutMs = 2500): Promise<boolean> {
  if (looksLikeStaticHost()) return false;
  if (probeCache !== undefined) return probeCache;
  if (!probeInflight) {
    probeInflight = probePipeline(timeoutMs)
      .then((ok) => {
        probeCache = ok;
        return ok;
      })
      .catch(() => {
        probeCache = false;
        return false;
      })
      .finally(() => {
        probeInflight = undefined;
      });
  }
  return probeInflight;
}

export function liveUploadBlocked(input: {
  fixture?: boolean;
  pipelineAvailable: boolean;
}): string | null {
  if (input.fixture) return null;
  if (!input.pipelineAvailable) return LIVE_PROCESSING_NEEDS_SERVER;
  return null;
}

/** Skip POSTing page images / YouTube fetches at `/api/pipeline` on Pages. */
export function shouldSkipLivePipelineApis(): boolean {
  if (forcePipelineFixture()) return true;
  return looksLikeStaticHost();
}

export function promiseWithTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
