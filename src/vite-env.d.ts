/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_VISION_MODEL?: string;
  readonly VITE_PIPELINE_FIXTURE?: string;
  readonly VITE_TTS_PROVIDER?: string;
  readonly VITE_OPENAI_TTS_MODEL?: string;
  readonly VITE_OPENAI_TTS_VOICE?: string;
  /** Origin that serves `/api/pipeline/*` for packaged iOS (empty = same origin / Vite). */
  readonly VITE_PIPELINE_API_URL?: string;
  /** Vite `base` for GitHub Pages (`/visual-guide/`). Empty locally / Capacitor (`./`). */
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
