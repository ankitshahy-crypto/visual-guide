import { describe, expect, it } from "vitest";
import { mergeSources } from "./mergeSources";
import type { ManualParse, VideoProposal } from "./types";
import type { Step } from "../types/guide";

describe("mergeSources", () => {
  it("keeps manual actions and figures when video conflicts", () => {
    const merged = mergeSources({
      title: "Fixture",
      guideId: "fixture",
      product: { brand: "Test", model: "Box", category: "toy" },
      manual: sampleManual(),
      video: sampleVideo(),
    });
    const step = merged.steps[0];
    expect(step.actions[0].detail).toBe("Turn the box right side up.");
    expect(step.figure?.page).toBe("1");
    expect(step.actions.some((a) => a.provenance === "inferred_from_video" && /click/i.test(a.detail))).toBe(true);
    const conflict = step.review_notes.find((n) => n.kind === "conflict");
    expect(conflict?.manual_claim).toBeTruthy();
    expect(conflict?.video_claim).toBeTruthy();
    expect(merged.source.video?.youtube_url).toBe("https://youtu.be/stub");
  });

  it("does not invent video fields or extra actions when there is no video", () => {
    const merged = mergeSources({
      title: "Fixture",
      guideId: "fixture",
      product: { brand: "Test", model: "Box", category: "toy" },
      manual: sampleManual(),
      video: null,
    });
    expect(merged.source.video ?? null).toBeNull();
    expect(merged.steps[0].actions).toHaveLength(1);
    expect(merged.steps[0].review_notes).toHaveLength(0);
  });
});

function sampleManual(): ManualParse {
  const step: Step = {
    id: "s1",
    index: 1,
    title: "Open the box",
    template: "figure_action",
    parts_used: [{ id: "A", qty: 1 }],
    tools: [],
    actions: [{ verb: "flip", object: "A", detail: "Turn the box right side up." }],
    figure: { page: "1", bbox: [0.1, 0.1, 0.9, 0.9], highlights: [] },
    narration: { standard: "Open the box. Turn it right side up.", simple: "Open the box. Turn it up." },
    warnings: [],
    tips: [],
    options: null,
    checkpoint: "The box sits flat.",
    estimated_seconds: 10,
    review_notes: [],
  };
  return {
    source: { type: "manual_photos", pages: [{ page: "1", image: "pages/p-01.jpg", width: 100, height: 100 }], missing_pages: [] },
    parts: [{ id: "A", name: "Box", qty: 1, kind: "component", provenance: "manual" }],
    steps: [step],
    log: [],
    stubbed: [],
  };
}

function sampleVideo(): VideoProposal {
  return {
    source: { youtube_url: "https://youtu.be/stub" },
    fetchStatus: "fixture",
    log: [],
    stubbed: [],
    beats: [
      {
        kind: "gap_fill",
        reason: "click_feel",
        stepId: "s1",
        action: {
          verb: "check",
          object: "A",
          detail: "From the video: push until you hear a click.",
          provenance: "inferred_from_video",
        },
        detail: "click/feel",
      },
      {
        kind: "conflict",
        reason: "order",
        stepId: "s1",
        detail: "Video order disagrees with the printed step.",
        manualClaim: "Turn the box right side up.",
        videoClaim: "Video shows the box opening from the other end first.",
      },
    ],
  };
}
