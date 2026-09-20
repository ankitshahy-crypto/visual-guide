import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./runPipeline";
import { SAMPLE_YOUTUBE_URL } from "./fixtures/sampleVideo";
import { listConflicts, listFills } from "../lib/review";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function photo(name: string, rel: string) {
  const buf = readFileSync(join(root, rel));
  return {
    name,
    mime: "image/jpeg",
    role: "photo" as const,
    dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`,
  };
}

describe("runPipeline", () => {
  it("walks parse → video → merge → conflicts and reports live stages", async () => {
    const stages: string[] = [];
    const out = await runPipeline(
      {
        name: "MagicH sample",
        files: [
          photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
          photo("p-04.jpg", "public/golden/pages/p-04.jpg"),
        ],
        youtubeUrl: SAMPLE_YOUTUBE_URL,
      },
      { onStage: (stage) => { stages.push(stage); } },
    );
    expect(stages[0]).toBe("parse");
    expect(stages).toContain("video");
    expect(stages).toContain("merge");
    expect(stages).toContain("conflicts");
    expect(out.stubbed).toEqual([]);
    expect(out.guide.steps.length).toBeGreaterThan(1);
    expect(listFills(out.guide).length).toBeGreaterThan(0);
    expect(listConflicts(out.guide).length).toBeGreaterThan(0);
    expect(out.guide.source.video?.youtube_url).toBe(SAMPLE_YOUTUBE_URL);
  });
});
