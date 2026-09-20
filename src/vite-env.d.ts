/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_VISION_MODEL?: string;
  readonly VITE_PIPELINE_FIXTURE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
