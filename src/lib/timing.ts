import type { Step } from "../types/guide";

export const FPS = 30;
export const CLIP_W = 1080;
export const CLIP_H = 1350;

export interface Span { from: number; dur: number }

export interface Schedule {
  total: number;
  title: Span;                 // step number + title reveal
  body: { from: number; to: number };  // figure visible, narration running
  actions: Span[];             // one caption beat per action, sequential
  options: Span | null;        // choice chips (options template)
  checkpoint: Span | null;     // closing "check" band
}

export function clipFrames(step: Step): number {
  return Math.max(FPS * 3, Math.round(step.estimated_seconds * FPS));
}

function slices(n: number, from: number, to: number): Span[] {
  if (n <= 0 || to <= from) return [];
  const dur = Math.floor((to - from) / n);
  return Array.from({ length: n }, (_, i) => ({ from: from + i * dur, dur }));
}

/** Derive every beat of a clip from the step's content and its estimated length. */
export function schedule(step: Step): Schedule {
  const total = clipFrames(step);
  const title: Span = { from: 0, dur: 24 };
  const checkpoint: Span | null = step.checkpoint ? { from: total - 75, dur: 75 } : null;
  const bodyFrom = 14;
  const bodyTo = checkpoint ? checkpoint.from : total;

  const hasOptions = step.template === "options" && !!step.options;
  const optionsDur = hasOptions ? Math.min(90, Math.floor((bodyTo - bodyFrom) * 0.35)) : 0;
  const actionsTo = bodyTo - optionsDur;

  const actions = slices(step.actions.length, bodyFrom + 10, actionsTo - 4);
  const options: Span | null = hasOptions ? { from: actionsTo, dur: optionsDur } : null;

  return { total, title, body: { from: bodyFrom, to: bodyTo }, actions, options, checkpoint };
}

export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
