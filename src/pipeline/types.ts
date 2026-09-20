import type { Action, ManualSource, Part, Product, Step, VideoSource } from "../types/guide";

export interface ManualParse {
  source: ManualSource;
  parts: Part[];
  steps: Step[];
  product?: Product;
  log: string[];
  stubbed: string[];
}

export type VideoBeatKind = "align" | "gap_fill" | "conflict";
export type VideoGapReason = "order" | "click_feel" | "orientation" | "hidden_fastener" | "other";

export interface VideoBeat {
  kind: VideoBeatKind;
  reason: VideoGapReason;
  detail: string;
  stepId?: string;
  stepIndex?: number;
  action?: Action;
  manualClaim?: string;
  videoClaim?: string;
}

export type VideoFetchStatus = "fetched" | "fixture" | "partial" | "skipped";

export interface VideoProposal {
  source: VideoSource;
  beats: VideoBeat[];
  fetchStatus: VideoFetchStatus;
  log: string[];
  stubbed: string[];
}

export interface PipelineResult {
  guideId: string;
  log: string[];
  stubbed: string[];
}

export interface UploadFile {
  name: string;
  mime: string;
  dataUrl: string;
  role: "pdf" | "photo";
}

export interface CaptionCue {
  t: number;
  text: string;
}

export type AudioKind = "speech" | "music" | "unknown" | "none";

export interface VideoFrameNote {
  t: number;
  note: string;
  imageUrl?: string;
}

export interface VideoObservation {
  youtubeUrl?: string;
  packagingUrl?: string;
  videoId?: string | null;
  title?: string | null;
  captions: CaptionCue[];
  audioKind: AudioKind;
  frames: VideoFrameNote[];
  fetchStatus: VideoFetchStatus;
  log: string[];
}

export interface VisionPageExtract {
  page: string;
  role: "cover" | "parts" | "step" | "warning" | "other";
  source_label?: string | null;
  title?: string | null;
  bbox?: [number, number, number, number];
  warnings: string[];
  actions: Action[];
  parts_used: { id: string; qty: number }[];
  text?: string;
}

export interface VisionExtract {
  mode: "openai" | "local" | "fixture";
  product?: Product;
  parts: Part[];
  pages: VisionPageExtract[];
  /** When set, parseManual uses these steps instead of synthesizing from page extracts. */
  steps?: Step[];
  log: string[];
}
