import type { Guide, ReviewNote, Step } from "../types/guide";

export interface FillItem {
  key: string;
  stepId: string;
  stepIndex: number;
  stepTitle: string;
  kind: "action" | "tip";
  text: string;
}

export interface ConflictItem {
  key: string;
  stepId: string;
  stepIndex: number;
  stepTitle: string;
  noteIndex: number;
  text: string;
  manualClaim?: string | null;
  videoClaim?: string | null;
}

export function listFills(guide: Guide): FillItem[] {
  const out: FillItem[] = [];
  for (const step of guide.steps) {
    step.actions.forEach((a, i) => {
      if (a.provenance === "inferred_from_video") {
        out.push({
          key: `${step.id}:action:${i}`,
          stepId: step.id,
          stepIndex: step.index,
          stepTitle: step.title,
          kind: "action",
          text: a.detail,
        });
      }
    });
    step.tips.forEach((t, i) => {
      if (t.provenance === "inferred_from_video") {
        out.push({
          key: `${step.id}:tip:${i}`,
          stepId: step.id,
          stepIndex: step.index,
          stepTitle: step.title,
          kind: "tip",
          text: t.text,
        });
      }
    });
  }
  return out;
}

export function listConflicts(guide: Guide): ConflictItem[] {
  const out: ConflictItem[] = [];
  for (const step of guide.steps) {
    step.review_notes.forEach((note, noteIndex) => {
      if (note.kind !== "conflict") return;
      out.push({
        key: `${step.id}:conflict:${noteIndex}`,
        stepId: step.id,
        stepIndex: step.index,
        stepTitle: step.title,
        noteIndex,
        text: note.text,
        manualClaim: note.manual_claim,
        videoClaim: note.video_claim,
      });
    });
  }
  return out;
}

export function needsReview(guide: Guide, acceptedFills: string[] = []): boolean {
  if (listConflicts(guide).length > 0) return true;
  return listFills(guide).some((f) => !acceptedFills.includes(f.key));
}

export function keepManual(guide: Guide, item: ConflictItem): Guide {
  return mapStep(guide, item.stepId, (step) => ({
    ...step,
    review_notes: step.review_notes.filter((_, i) => i !== item.noteIndex),
  }));
}

/** Record the video claim as a tip. Never overwrite the manual action or figure. */
export function useVideo(guide: Guide, item: ConflictItem): { guide: Guide; acceptedKey: string } {
  const text = (item.videoClaim || item.text).trim();
  let acceptedKey = "";
  const next = mapStep(guide, item.stepId, (step) => {
    const tips = [...step.tips, { text, provenance: "inferred_from_video" as const }];
    acceptedKey = `${step.id}:tip:${tips.length - 1}`;
    return {
      ...step,
      tips,
      review_notes: step.review_notes.filter((_, i) => i !== item.noteIndex),
    };
  });
  return { guide: next, acceptedKey };
}

function mapStep(guide: Guide, stepId: string, fn: (step: Step) => Step): Guide {
  return {
    ...guide,
    steps: guide.steps.map((s) => (s.id === stepId ? cloneStep(fn(s)) : s)),
  };
}

function cloneStep(s: Step): Step {
  return {
    ...s,
    parts_used: s.parts_used.map((p) => ({ ...p })),
    tools: [...s.tools],
    actions: s.actions.map((a) => ({ ...a })),
    figure: s.figure ? { ...s.figure, bbox: [...s.figure.bbox], highlights: (s.figure.highlights ?? []).map((h) => [...h]) } : s.figure,
    warnings: s.warnings.map((n) => ({ ...n })),
    tips: s.tips.map((n) => ({ ...n })),
    options: s.options ? { ...s.options, choices: s.options.choices.map((c) => ({ ...c })) } : s.options,
    review_notes: s.review_notes.map((n: ReviewNote) => ({ ...n })),
    narration: { ...s.narration },
  };
}
