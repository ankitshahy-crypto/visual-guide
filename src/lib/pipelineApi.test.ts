import { describe, expect, it } from "vitest";
import { fetchPipelineJson, pipelineApiBase, pipelineApiUrl } from "./pipelineApi";

describe("pipelineApiUrl", () => {
  it("uses same-origin /api paths when VITE_PIPELINE_API_URL is unset (web + default iOS bundle)", () => {
    expect(pipelineApiBase()).toBe("");
    expect(pipelineApiUrl("/api/pipeline/tts")).toBe("/api/pipeline/tts");
    expect(pipelineApiUrl("api/pipeline/vision")).toBe("/api/pipeline/vision");
  });

  it("treats a timed-out or non-JSON pipeline response as a miss", async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () => {
      await new Promise((r) => setTimeout(r, 50));
      return new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } });
    }) as typeof fetch;
    try {
      expect(await fetchPipelineJson("/api/pipeline/tts/status", undefined, 20)).toBeNull();
    } finally {
      globalThis.fetch = prev;
    }
  });
});
