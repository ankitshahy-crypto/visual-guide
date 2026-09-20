import type { Narration, Step } from "../types/guide";

/** Fill both reading levels (text). Spoken audio is hashed TTS in `tts.ts`. */
export function narrate(step: Pick<Step, "title" | "actions" | "checkpoint">): Narration {
  const bits = step.actions.map((a) => a.detail).filter(Boolean);
  const body = bits.length ? bits.join(" ") : `Follow the diagram for ${step.title}.`;
  const standard = clamp(`${step.title}. ${body}${step.checkpoint ? ` Then check: ${step.checkpoint}` : ""}`, 600);
  return { standard, simple: simplify(standard) };
}

function simplify(text: string): string {
  const short = text
    .replace(/\bthe underside of the\b/gi, "the bottom of the")
    .replace(/\bposition\b/gi, "put")
    .replace(/\binsert\b/gi, "put in")
    .replace(/\bfasten\b/gi, "bolt")
    .replace(/\btighten\b/gi, "snug")
    .replace(/\bmechanism\b/gi, "part")
    .replace(/\bapproximately\b/gi, "about")
    .replace(/\bensure\b/gi, "make sure");
  const sentences = short.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [short];
  const kept = sentences.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
  return clamp(kept, 400);
}

function clamp(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}
