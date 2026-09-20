/** Read pipeline env in Vite (import.meta.env) and Node (process.env). */

export function openaiApiKey(override?: string): string | undefined {
  if (override?.trim()) return override.trim();
  const vite = viteEnv("VITE_OPENAI_API_KEY");
  if (vite) return vite;
  return processEnv("OPENAI_API_KEY");
}

export function openaiVisionModel(): string {
  return viteEnv("VITE_OPENAI_VISION_MODEL")
    || processEnv("OPENAI_VISION_MODEL")
    || "gpt-4o-mini";
}

export function forcePipelineFixture(): boolean {
  const v = viteEnv("VITE_PIPELINE_FIXTURE") || processEnv("PIPELINE_FIXTURE") || "";
  return v === "1" || v.toLowerCase() === "true";
}

export type TtsProviderPref = "auto" | "openai" | "espeak" | "off";

/** auto (default) = OpenAI when a key is set, else local espeak-ng, else none. */
export function ttsProviderPref(): TtsProviderPref {
  const v = (viteEnv("VITE_TTS_PROVIDER") || processEnv("TTS_PROVIDER") || "auto").toLowerCase();
  if (v === "openai" || v === "espeak" || v === "off" || v === "auto") return v;
  return "auto";
}

export function openaiTtsModel(): string {
  return viteEnv("VITE_OPENAI_TTS_MODEL") || processEnv("OPENAI_TTS_MODEL") || "tts-1";
}

export function openaiTtsVoice(): string {
  return viteEnv("VITE_OPENAI_TTS_VOICE") || processEnv("OPENAI_TTS_VOICE") || "alloy";
}

function viteEnv(key: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const v = env?.[key];
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function processEnv(key: string): string | undefined {
  try {
    const v = globalThis.process?.env?.[key];
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}
