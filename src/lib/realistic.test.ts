import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "./validate";
import { bundledRealisticIndex, realisticPartFile, realisticStepFile } from "./realistic";

const root = resolve(import.meta.dirname, "../..");

describe("realistic stills index", () => {
  const guide = assertGuide(golden);

  it("covers every MagicH step and part, and ignores other guides", () => {
    expect(bundledRealisticIndex.guide_id).toBe(guide.guide_id);
    for (const step of guide.steps) {
      expect(realisticStepFile(guide, step.id), step.id).toMatch(/^golden\/realistic\/steps\/.+\.jpg$/);
    }
    for (const part of guide.parts) {
      expect(realisticPartFile(guide, part.id), part.id).toMatch(/^golden\/realistic\/parts\/.+\.jpg$/);
    }
    expect(realisticStepFile({ ...guide, guide_id: "other-manual" }, "s1")).toBeNull();
    expect(realisticPartFile({ ...guide, guide_id: "other-manual" }, "A")).toBeNull();
    expect(realisticStepFile(guide, "missing")).toBeNull();
  });

  it("points at committed jpeg files", () => {
    const files = [...Object.values(bundledRealisticIndex.steps), ...Object.values(bundledRealisticIndex.parts)];
    for (const rel of files) {
      const path = resolve(root, "public", rel);
      expect(existsSync(path), rel).toBe(true);
      expect(statSync(path).size, rel).toBeGreaterThan(8_000);
    }
  });

  it("keeps the manual crop as the fallback in the player", () => {
    const figure = readFileSync(resolve(root, "src/remotion/templates/FigureAction.tsx"), "utf8");
    const parts = readFileSync(resolve(root, "src/remotion/templates/PartsOverview.tsx"), "utf8");
    const thumb = readFileSync(resolve(root, "src/components/FigureThumb.tsx"), "utf8");
    expect(figure).toContain("realisticStepSrc");
    expect(figure).toContain("<FigureCrop");
    expect(figure).toContain("<RealisticStill");
    expect(parts).toContain("realisticPartSrc");
    expect(parts).toContain("{p.id}");
    expect(thumb).toContain("realisticStepSrc");
    expect(thumb).toContain("pageImageUrl");
  });
});
