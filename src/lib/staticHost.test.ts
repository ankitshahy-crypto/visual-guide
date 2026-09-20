import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LIVE_PROCESSING_NEEDS_SERVER,
  hostnameLooksStatic,
  liveUploadBlocked,
  looksLikePackagedCapacitor,
  looksLikeStaticHost,
  promiseWithTimeout,
} from "./staticHost";

const root = resolve(import.meta.dirname, "../..");

describe("static / no-API host", () => {
  it("treats GitHub Pages as static when no pipeline API base is set", () => {
    expect(hostnameLooksStatic("ankitshahy-crypto.github.io")).toBe(true);
    expect(hostnameLooksStatic("example.github.io")).toBe(true);
    expect(hostnameLooksStatic("localhost")).toBe(false);
    expect(looksLikeStaticHost("ankitshahy-crypto.github.io", "")).toBe(true);
    expect(looksLikeStaticHost("ankitshahy-crypto.github.io", "https://api.example")).toBe(false);
    expect(looksLikeStaticHost("localhost", "")).toBe(false);
  });

  it("treats packaged Capacitor (https://localhost, no port) as no-API, not Vite live-reload", () => {
    expect(looksLikePackagedCapacitor({ protocol: "https:", hostname: "localhost", port: "" })).toBe(true);
    expect(looksLikePackagedCapacitor({ protocol: "http:", hostname: "localhost", port: "5173" })).toBe(false);
    expect(looksLikePackagedCapacitor({ protocol: "https:", hostname: "localhost", port: "5173" })).toBe(false);
    expect(looksLikePackagedCapacitor({ protocol: "http:", hostname: "127.0.0.1", port: "" })).toBe(false);
    expect(looksLikePackagedCapacitor({})).toBe(false);
  });

  it("blocks live upload without fixture when the pipeline is missing", () => {
    expect(liveUploadBlocked({ fixture: true, pipelineAvailable: false })).toBeNull();
    expect(liveUploadBlocked({ fixture: true, pipelineAvailable: true })).toBeNull();
    expect(liveUploadBlocked({ fixture: false, pipelineAvailable: true })).toBeNull();
    expect(liveUploadBlocked({ pipelineAvailable: false })).toBe(LIVE_PROCESSING_NEEDS_SERVER);
    expect(LIVE_PROCESSING_NEEDS_SERVER).toContain("Live processing needs a server");
    expect(LIVE_PROCESSING_NEEDS_SERVER).toContain("Use fixture pages");
    expect(LIVE_PROCESSING_NEEDS_SERVER).toContain("VITE_PIPELINE_API_URL");
  });

  it("times out a hanging promise", async () => {
    await expect(promiseWithTimeout(new Promise(() => {}), 20, LIVE_PROCESSING_NEEDS_SERVER))
      .rejects.toThrow(LIVE_PROCESSING_NEEDS_SERVER);
  });

  it("wires New guide / Analyzing to the fixture path and the static error", () => {
    const neu = readFileSync(resolve(root, "src/pages/NewGuide.tsx"), "utf8");
    const analyzing = readFileSync(resolve(root, "src/pages/Analyzing.tsx"), "utf8");
    const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
    expect(neu).toContain("Use fixture pages (no API key)");
    expect(neu).toContain("This build has no live pipeline API");
    expect(neu).toContain("liveUploadBlocked");
    expect(neu).toContain("autoFixture");
    expect(neu).toContain("data-static-preview-banner");
    expect(analyzing).toContain("liveUploadBlocked");
    expect(analyzing).toContain("LIVE_PROCESSING_NEEDS_SERVER");
    expect(analyzing).toContain("promiseWithTimeout");
    expect(app).toContain('go("/new?fixture=1")');
    expect(app).toContain("autoFixture={Boolean(route.fixture)}");
  });
});
