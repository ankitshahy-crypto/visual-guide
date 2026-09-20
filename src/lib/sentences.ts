/** Split narration into sentences and give each a frame window proportional to its length. */
export interface Cue { text: string; from: number; to: number }

export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) ?? [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function cues(text: string, from: number, to: number): Cue[] {
  const sentences = splitSentences(text);
  const totalChars = sentences.reduce((n, s) => n + s.length, 0) || 1;
  const span = Math.max(1, to - from);
  let cursor = from;
  return sentences.map((s, i) => {
    const dur = i === sentences.length - 1 ? to - cursor : Math.round((s.length / totalChars) * span);
    const cue = { text: s, from: cursor, to: cursor + dur };
    cursor += dur;
    return cue;
  });
}

export function cueAt(list: Cue[], frame: number): Cue | null {
  return list.find((c) => frame >= c.from && frame < c.to) ?? null;
}
