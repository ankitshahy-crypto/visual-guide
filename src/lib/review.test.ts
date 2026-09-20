import { describe, expect, it } from "vitest";
import { keepManual, listConflicts, listFills, useVideo } from "./review";
import type { Guide } from "../types/guide";

function guide(): Guide {
  return {
    schema_version: "0.2",
    guide_id: "t",
    title: "T",
    content_model: "procedural",
    product: { brand: "T", model: "T", category: "toy" },
    source: { manual: { type: "manual_photos", pages: [{ page: "1", image: "x", width: 10, height: 10 }], missing_pages: [] } },
    parts: [{ id: "A", name: "Box", qty: 1, kind: "component", provenance: "manual" }],
    steps: [{
      id: "s1",
      index: 1,
      title: "Open",
      template: "figure_action",
      parts_used: [{ id: "A", qty: 1 }],
      tools: [],
      actions: [
        { verb: "flip", object: "A", detail: "Turn the box right side up.", provenance: "manual" },
        { verb: "check", object: "A", detail: "From the video: push until it clicks.", provenance: "inferred_from_video" },
      ],
      figure: { page: "1", bbox: [0.1, 0.1, 0.9, 0.9], highlights: [] },
      narration: { standard: "Open.", simple: "Open." },
      warnings: [],
      tips: [],
      options: null,
      checkpoint: "Done.",
      estimated_seconds: 10,
      review_notes: [{
        kind: "conflict",
        text: "Order disagrees",
        manual_claim: "Turn the box right side up.",
        video_claim: "Video opens the other end first.",
      }],
    }],
  };
}

describe("review decisions", () => {
  it("lists Accept fills and Keep manual / Use video conflicts", () => {
    const g = guide();
    expect(listFills(g)).toHaveLength(1);
    expect(listConflicts(g)).toHaveLength(1);
  });

  it("Keep manual drops the conflict and leaves the printed action", () => {
    const g = guide();
    const item = listConflicts(g)[0];
    const next = keepManual(g, item);
    expect(listConflicts(next)).toHaveLength(0);
    expect(next.steps[0].actions[0].detail).toBe("Turn the box right side up.");
  });

  it("Use video records a tip and does not overwrite the manual action", () => {
    const g = guide();
    const item = listConflicts(g)[0];
    const { guide: next } = useVideo(g, item);
    expect(next.steps[0].actions[0].detail).toBe("Turn the box right side up.");
    expect(next.steps[0].tips.some((t) => t.provenance === "inferred_from_video" && /other end/i.test(t.text))).toBe(true);
    expect(listConflicts(next)).toHaveLength(0);
  });
});
