import type { Action, Guide, Product, ReviewNote, Step } from "../types/guide";
import type { ManualParse, VideoBeat, VideoProposal } from "./types";

/**
 * mergeSources — manual wins; video fills gaps; disagreements become review flags.
 *
 * This module is real (not a stub). It is the rule the later vision/fetch jobs
 * must keep: never overwrite a manual title, figure, part, or action with video.
 */
export function mergeSources(input: {
  title: string;
  guideId: string;
  product: Product;
  manual: ManualParse;
  video: VideoProposal | null;
}): Guide {
  const steps: Step[] = input.manual.steps.map(cloneStep);
  const byId = new Map(steps.map((s) => [s.id, s]));
  const byIndex = new Map(steps.map((s) => [s.index, s]));

  if (input.video) {
    for (const beat of input.video.beats) {
      const step = (beat.stepId && byId.get(beat.stepId))
        || (beat.stepIndex != null ? byIndex.get(beat.stepIndex) : undefined)
        || steps.at(-1);
      if (!step) continue;
      applyBeat(step, beat);
    }
  }

  return {
    schema_version: "0.2",
    guide_id: input.guideId,
    title: input.title,
    content_model: "procedural",
    product: input.product,
    source: {
      manual: input.manual.source,
      video: input.video?.source ?? null,
    },
    parts: input.manual.parts.map((p) => ({ ...p })),
    steps,
  };
}

function applyBeat(step: Step, beat: VideoBeat): void {
  if (beat.kind === "conflict") {
    step.review_notes = [...step.review_notes, conflictNote(beat)];
    return;
  }
  if (beat.kind === "align") {
    step.tips = [...step.tips, { text: beat.detail, provenance: "inferred_from_video" }];
    return;
  }
  // gap_fill
  if (beat.action) {
    if (alreadyHasDetail(step, beat.action.detail)) return;
    if (step.template === "parts_overview") {
      step.tips = [...step.tips, { text: beat.action.detail, provenance: "inferred_from_video" }];
      return;
    }
    step.actions = [...step.actions, { ...beat.action, provenance: "inferred_from_video" }];
    return;
  }
  step.tips = [...step.tips, { text: beat.detail, provenance: "inferred_from_video" }];
}

function alreadyHasDetail(step: Step, detail: string): boolean {
  const needle = detail.trim().toLowerCase();
  return step.actions.some((a) => a.detail.trim().toLowerCase() === needle);
}

function conflictNote(beat: VideoBeat): ReviewNote {
  return {
    kind: "conflict",
    text: beat.detail,
    manual_claim: beat.manualClaim ?? null,
    video_claim: beat.videoClaim ?? null,
  };
}

function cloneStep(s: Step): Step {
  return {
    ...s,
    parts_used: s.parts_used.map((p) => ({ ...p })),
    tools: [...s.tools],
    actions: s.actions.map((a): Action => ({ ...a })),
    figure: s.figure ? { ...s.figure, bbox: [...s.figure.bbox], highlights: (s.figure.highlights ?? []).map((h) => [...h]) } : s.figure,
    warnings: s.warnings.map((n) => ({ ...n })),
    tips: s.tips.map((n) => ({ ...n })),
    options: s.options ? { ...s.options, choices: s.options.choices.map((c) => ({ ...c })) } : s.options,
    review_notes: s.review_notes.map((n) => ({ ...n })),
    narration: { ...s.narration },
  };
}
