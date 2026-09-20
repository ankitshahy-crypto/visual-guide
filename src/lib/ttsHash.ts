/** Normalize narration so cache keys stay stable across whitespace/unicode noise. */
export function normalizeNarration(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** ~144 wpm — used when a cached file has no measurable duration. */
export function estimateDurationMs(text: string): number {
  const words = normalizeNarration(text).split(" ").filter(Boolean).length;
  const chars = normalizeNarration(text).length;
  const byWords = (words / 2.4) * 1000;
  const byChars = (chars / 14) * 1000;
  return Math.max(400, Math.round(Math.max(byWords, byChars)));
}
