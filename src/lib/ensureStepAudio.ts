import type { Step, NarrationLevel } from "../types/guide";
import { estimateDurationMs } from "./ttsHash";
import { splitSentences } from "./sentences";
import {
  bundledNarrationIndex,
  canUseSpeechSynthesis,
  resolveLinesFromIndex,
  type NarrationMode,
  type ResolvedAudioLine,
} from "./narrationAudio";
import { pipelineApiUrl } from "./pipelineApi";

export interface EnsureAudioResult {
  status: NarrationMode;
  lines: ResolvedAudioLine[] | null;
}

async function requestTts(lines: string[]): Promise<ResolvedAudioLine[] | null> {
  try {
    const res = await fetch(pipelineApiUrl("/api/pipeline/tts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      lines?: Array<{ text: string; hash: string; src?: string | null; durationMs?: number | null }>;
    };
    if (!data.lines?.length || data.lines.some((l) => !l.src)) return null;
    return data.lines.map((l) => ({
      text: l.text,
      hash: l.hash,
      src: l.src as string,
      durationMs: l.durationMs && l.durationMs > 0 ? l.durationMs : estimateDurationMs(l.text),
    }));
  } catch {
    return null;
  }
}

/** Prefer hashed files (golden index, then dev TTS). Else browser speech. */
export async function ensureStepAudio(step: Step, level: NarrationLevel): Promise<EnsureAudioResult> {
  const text = step.narration[level];
  const bundled = resolveLinesFromIndex(text, bundledNarrationIndex);
  if (bundled) return { status: "files", lines: bundled };

  const generated = await requestTts(splitSentences(text));
  if (generated) return { status: "files", lines: generated };

  if (canUseSpeechSynthesis()) return { status: "live", lines: null };
  return { status: "none", lines: null };
}
