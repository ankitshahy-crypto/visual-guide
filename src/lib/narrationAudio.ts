import type { Cue } from "./sentences";
import { cues as cuesFromText, splitSentences } from "./sentences";
import { estimateDurationMs, normalizeNarration } from "./ttsHash";
import { FPS } from "./timing";
import narrationIndex from "../data/narration-index.json";
import { publicUrl } from "./publicUrl";

export interface NarrationFile {
  hash: string;
  file: string;
  durationMs: number;
  text: string;
}

export interface NarrationIndex {
  version: number;
  provider: string;
  generatedAt?: string;
  files: Record<string, NarrationFile>;
}

export interface ResolvedAudioLine {
  text: string;
  hash: string;
  src: string;
  durationMs: number;
}

export interface AudioClip {
  src: string;
  from: number;
  dur: number;
  playbackRate: number;
}

export interface NarrationPlan {
  cues: Cue[];
  clips: AudioClip[];
}

export type NarrationMode = "files" | "live" | "none";

export const bundledNarrationIndex = narrationIndex as NarrationIndex;

export function publicAudioSrc(file: string): string {
  return publicUrl(file);
}

export function resolveLinesFromIndex(text: string, index: NarrationIndex = bundledNarrationIndex): ResolvedAudioLine[] | null {
  const sentences = splitSentences(text);
  if (!sentences.length) return null;
  const byText = new Map<string, NarrationFile>();
  for (const entry of Object.values(index.files)) {
    byText.set(normalizeNarration(entry.text), entry);
  }
  const lines: ResolvedAudioLine[] = [];
  for (const sentence of sentences) {
    const hit = byText.get(normalizeNarration(sentence));
    if (!hit?.file) return null;
    lines.push({
      text: sentence,
      hash: hit.hash,
      src: publicAudioSrc(hit.file),
      durationMs: hit.durationMs > 0 ? hit.durationMs : estimateDurationMs(sentence),
    });
  }
  return lines;
}

export function planNarration(
  text: string,
  from: number,
  to: number,
  audio?: ResolvedAudioLine[] | null,
  fps: number = FPS,
): NarrationPlan {
  if (audio?.length) {
    const timed = cuesFromDurations(audio, from, to, fps);
    const clips: AudioClip[] = audio.map((line, i) => {
      const cue = timed.cues[i];
      return {
        src: line.src,
        from: cue?.from ?? from,
        dur: Math.max(1, (cue?.to ?? to) - (cue?.from ?? from)),
        playbackRate: timed.playbackRate,
      };
    });
    return { cues: timed.cues, clips };
  }
  return { cues: cuesFromText(text, from, to), clips: [] };
}

export function cuesFromDurations(
  lines: { text: string; durationMs: number }[],
  from: number,
  to: number,
  fps: number = FPS,
): { cues: Cue[]; playbackRate: number } {
  const span = Math.max(1, to - from);
  const availableMs = (span / fps) * 1000;
  const totalMs = lines.reduce((n, l) => n + Math.max(1, l.durationMs), 0);
  const playbackRate = totalMs > availableMs ? totalMs / availableMs : 1;
  let cursor = from;
  const cues: Cue[] = lines.map((line, i) => {
    const ms = Math.max(1, line.durationMs) / playbackRate;
    const dur = i === lines.length - 1
      ? to - cursor
      : Math.max(1, Math.round((ms / 1000) * fps));
    const cue = { text: line.text, from: cursor, to: cursor + dur };
    cursor += dur;
    return cue;
  });
  if (cues.length) cues[cues.length - 1].to = to;
  return { cues, playbackRate };
}

export function canUseSpeechSynthesis(): boolean {
  return typeof window !== "undefined"
    && "speechSynthesis" in window
    && typeof SpeechSynthesisUtterance !== "undefined";
}
