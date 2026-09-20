import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listConflicts, listFills } from "./review";
import {
  loadRecordedFixtureFiles,
  RECORDED_FIXTURE_NAME,
  RECORDED_FIXTURE_PAGES,
  RECORDED_FIXTURE_YOUTUBE_URL,
  recordedFixturePending,
} from "./fixtureCreate";
import { runPipeline } from "../pipeline/runPipeline";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("recorded fixture create", () => {
  it("marks pending create as fixture with the offline YouTube id", () => {
    const pending = recordedFixturePending([
      { name: "parts-list.jpg", mime: "image/jpeg", role: "photo", dataUrl: "data:image/jpeg,x" },
    ], "  Chair demo  ");
    expect(pending.fixture).toBe(true);
    expect(pending.name).toBe("Chair demo");
    expect(pending.youtubeUrl).toBe(RECORDED_FIXTURE_YOUTUBE_URL);
    expect(RECORDED_FIXTURE_YOUTUBE_URL).toContain("vgfixture001");
    expect(recordedFixturePending([]).name).toBe(RECORDED_FIXTURE_NAME);
  });

  it("loads committed fixture JPEGs and finishes parse → video → review offline", async () => {
    const files = await loadRecordedFixtureFiles(async (publicPath) => {
      const buf = readFileSync(join(root, "public", publicPath));
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    });
    expect(files.map((f) => f.name)).toEqual(RECORDED_FIXTURE_PAGES.map((p) => p.name));
    const pending = recordedFixturePending(files);
    const out = await runPipeline({
      name: pending.name,
      files: pending.files,
      youtubeUrl: pending.youtubeUrl,
    });
    expect(out.guide.steps.length).toBeGreaterThan(1);
    expect(listFills(out.guide).length).toBeGreaterThan(0);
    expect(listConflicts(out.guide).length).toBeGreaterThan(0);
    expect(out.guide.source.video?.youtube_url).toBe(RECORDED_FIXTURE_YOUTUBE_URL);
  });
});
