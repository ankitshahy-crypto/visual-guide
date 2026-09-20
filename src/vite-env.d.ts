/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_VISION_MODEL?: string;
  readonly VITE_PIPELINE_FIXTURE?: string;
  readonly VITE_TTS_PROVIDER?: string;
  readonly VITE_OPENAI_TTS_MODEL?: string;
  readonly VITE_OPENAI_TTS_VOICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
