import type { Action, ManualSource, Part, SourcePage, Step, VideoSource } from "../types/guide";

export interface ManualParse {
  source: ManualSource;
  parts: Part[];
  steps: Step[];
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

export interface VideoProposal {
  source: VideoSource;
  beats: VideoBeat[];
  fetchStatus: "stubbed" | "fetched";
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
