import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "../lib/validate";
import { buildPartPrompt, buildStepPrompt, estimateImageUsd, realisticStyleBlock } from "./realisticPrompts";
import { cropJpeg, resolveManualImage } from "./cliRealistic";

const root = resolve(import.meta.dirname, "../..");

describe("realistic prompts", () => {
  const guide = assertGuide(golden);
  const seat = guide.steps.find((s) => s.id === "s1");
  const headrest = guide.parts.find((p) => p.id === "A");

  it("grounds a step in the manual action and refuses painted letter tags", () => {
    expect(seat).toBeTruthy();
    const prompt = buildStepPrompt(guide, seat!);
    expect(prompt).toContain("Turn the seat upside down");
    expect(prompt).toContain("Mechanism");
    expect(prompt).toContain("Newtral");
    expect(prompt).toContain("Do not paint letters");
    expect(realisticStyleBlock()).toContain("No text");
    expect(realisticStyleBlock()).toContain("spatial source of truth");
  });

  it("names the catalog part on a chip prompt", () => {
    expect(headrest).toBeTruthy();
    const prompt = buildPartPrompt(guide, headrest!);
    expect(prompt).toContain("Headrest");
    expect(prompt).toContain("Do not paint letters");
  });

  it("estimates a full MagicH pass in dollars, not tokens", () => {
    const steps = guide.steps.length * estimateImageUsd("step", "medium");
    const parts = guide.parts.length * estimateImageUsd("part", "medium");
    expect(steps + parts).toBeGreaterThan(0.5);
    expect(steps + parts).toBeLessThan(5);
    expect(estimateImageUsd("step", "high")).toBeGreaterThan(estimateImageUsd("step", "medium"));
  });

  it("documents the OpenAI image script", () => {
    const cli = readFileSync(resolve(root, "src/pipeline/cliRealistic.ts"), "utf8");
    const script = readFileSync(resolve(root, "scripts/generate-realistic.mjs"), "utf8");
    const doc = readFileSync(resolve(root, "docs/REALISTIC-VISUALS.md"), "utf8");
    expect(cli).toContain("https://api.openai.com/v1/images/edits");
    expect(cli).toContain("OPENAI_API_KEY");
    expect(cli).toContain("--dry-run");
    expect(script).toContain("cliRealistic.ts");
    expect(doc).toContain("OPENAI_API_KEY");
    expect(doc).toContain("npm run realistic");
    expect(doc).toContain("never required");
    expect(doc).toContain("--product-photo");
  });
});

describe("manual figure crop", () => {
  it("resolves a golden page and crops the step bbox", () => {
    const guide = assertGuide(golden);
    const step = guide.steps.find((s) => s.id === "s1")!;
    const page = guide.source.manual.pages.find((p) => p.page === step.figure!.page)!;
    const src = resolveManualImage(page.image);
    expect(src).toContain("p-04.jpg");
    const dest = resolve(root, "out/realistic-crop-s1.jpg");
    cropJpeg(src, step.figure!.bbox, dest);
    const size = readFileSync(dest).byteLength;
    expect(size).toBeGreaterThan(1000);
  });
});
