import { describe, expect, it } from "vitest";
import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "./validate";

describe("golden MagicH Pro chair fixture", () => {
  it("still validates and keeps assembler clips intact", () => {
    const guide = assertGuide(golden);
    expect(guide.guide_id).toBe("newtral-magich-pro-assembly");
    expect(guide.steps).toHaveLength(10);
    expect(guide.parts.map((p) => p.id)).toContain("A");
    expect(guide.parts.find((p) => p.id === "L")?.kind).toBe("tool");
    expect(guide.steps[0].template).toBe("parts_overview");
    expect(guide.steps.filter((s) => s.template === "figure_action").every((s) => s.actions.length && s.figure)).toBe(true);
    expect(guide.steps.every((s) => s.narration.standard && s.narration.simple)).toBe(true);
    expect(guide.source.manual.pages.length).toBe(9);
  });
});
