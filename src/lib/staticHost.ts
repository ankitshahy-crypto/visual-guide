import { fetchPipelineJson, pipelineApiBase } from "./pipelineApi";
import { forcePipelineFixture } from "../pipeline/env";

/** Shown when Analyzing would otherwise spin with no `/api/pipeline`. */
export const LIVE_PROCESSING_NEEDS_SERVER =
  "Live processing needs a server. Use fixture pages, or run with npm run dev / set VITE_PIPELINE_API_URL.";

export type LocationLike = {
  protocol?: string;
  hostname?: string;
  port?: string;
};

export function currentLocation(): LocationLike {
  if (typeof location === "undefined") return {};
  return {
    protocol: location.protocol,
    hostname: location.hostname,
    port: location.port,
  };
}

export function hostnameLooksStatic(hostname: string): boolean {
  return hostname.trim().toLowerCase().endsWith(".github.io");
}

/**
 * Packaged Capacitor iOS loads the bundled `dist/` at `https://localhost` (no port).
 * Live-reload (`CAPACITOR_LIVE_RELOAD=http://localhost:5173`) uses http + a Vite port
 * and is *not* packaged — `/api/pipeline` then hits `npm run dev`.
 */
export function looksLikePackagedCapacitor(loc: LocationLike = currentLocation()): boolean {
  const host = (loc.hostname ?? "").trim().toLowerCase();
  const protocol = (loc.protocol ?? "").trim().toLowerCase();
  const port = `${loc.port ?? ""}`;
  return protocol === "https:" && host === "localhost" && port === "";
}

/**
 * No live `/api/pipeline` on this origin unless `VITE_PIPELINE_API_URL` is set.
 * True for GitHub Pages and for the packaged iOS bundle. False for `npm run dev`
 * and for Capacitor live-reload against Vite.
 */
export function looksLikeStaticHost(
  hostname = currentLocation().hostname ?? "",
  apiBase = pipelineApiBase(),
): boolean {
  if (apiBase) return false;
  if (hostnameLooksStatic(hostname)) return true;
  return looksLikePackagedCapacitor();
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

/** Skip POSTing page images / YouTube fetches when this origin has no pipeline API. */
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
