import { describe, expect, it } from "vitest";
import { pipelineApiBase, pipelineApiUrl } from "./pipelineApi";

describe("pipelineApiUrl", () => {
  it("uses same-origin /api paths when VITE_PIPELINE_API_URL is unset (web + default iOS bundle)", () => {
    expect(pipelineApiBase()).toBe("");
    expect(pipelineApiUrl("/api/pipeline/tts")).toBe("/api/pipeline/tts");
    expect(pipelineApiUrl("api/pipeline/vision")).toBe("/api/pipeline/vision");
  });
});
