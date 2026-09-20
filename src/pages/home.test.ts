import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const home = readFileSync(resolve(import.meta.dirname, "ProjectList.tsx"), "utf8");
const app = readFileSync(resolve(import.meta.dirname, "../App.tsx"), "utf8");
const stepPlayer = readFileSync(resolve(root, "src/components/StepPlayer.tsx"), "utf8");

describe("in-app home (Projects)", () => {
  it("explains Plainstep on the first screen", () => {
    expect(home).toContain('title="Plainstep"');
    expect(home).toContain("Clear assembly videos from any manual.");
    expect(home).toContain("How it works");
    expect(home).toContain("Upload manual");
    expect(home).toContain("Review AI steps");
    expect(home).toContain("Follow clips with checkpoints");
    expect(home).toContain("Simple words");
    expect(home).toContain("Try a sample");
    expect(home).toContain("Your guides");
    expect(home).toContain("No guides yet. Tap New guide to turn a PDF or page photos into clips.");
    expect(home).toContain("New guide");
    expect(home).toContain("badge=\"Sample\"");
  });

  it("keeps help, seller, and the orange New guide CTA", () => {
    expect(home).toContain("SUPPORT_EMAIL");
    expect(home).toContain("SUPPORT_MAILTO");
    expect(home).toContain("LEGAL_OWNER");
    expect(home).toContain("Help & support");
    expect(home).toContain("<OrangeButton onClick={onNew}>New guide</OrangeButton>");
  });

  it("does not add a marketing-site route", () => {
    expect(app).not.toMatch(/plainstep\.app/);
    expect(app).not.toContain('page: "marketing"');
    expect(app).toContain('return { page: "list" }');
  });

  it("keeps the clip player paper-white", () => {
    expect(stepPlayer).toContain("bg-paper");
    expect(stepPlayer).toContain("Paper-white stage");
  });
});
