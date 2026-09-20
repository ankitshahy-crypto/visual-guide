import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "../lib/validate";
import { writeGoldenNarration, detectTtsProvider, indexCoversGuide } from "./tts";

export async function main(): Promise<void> {
  const guide = assertGuide(golden);
  const provider = detectTtsProvider();
  if (provider === "none") {
    throw new Error("No TTS provider. Install espeak-ng or set OPENAI_API_KEY (see README).");
  }
  const index = await writeGoldenNarration(guide);
  const missing = indexCoversGuide(guide, index);
  const n = Object.keys(index.files).length;
  console.log(`TTS provider: ${index.provider}`);
  console.log(`Cached ${n} unique narration line(s) under public/narration/`);
  if (missing.length) {
    throw new Error(`Missing audio for ${missing.length} line(s): ${missing.slice(0, 5).join(" | ")}`);
  }
}

export { writeGoldenNarration };
