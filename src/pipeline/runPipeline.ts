import { assertGuide } from "../lib/validate";
import { analyzeVideo } from "./analyzeVideo";
import { mergeSources } from "./mergeSources";
import { parseManual, type ParseManualOptions } from "./parseManual";
import type { PipelineResult, UploadFile } from "./types";
import type { Guide } from "../types/guide";
import type { AnalyzeVideoOptions } from "./analyzeVideo";

export interface RunPipelineInput {
  name: string;
  files: UploadFile[];
  youtubeUrl?: string;
  packagingUrl?: string;
}

export interface RunPipelineOutput extends PipelineResult {
  guide: Guide;
}

export type PipelineStage = "parse" | "video" | "merge" | "conflicts";

export interface RunPipelineOptions {
  onStage?: (stage: PipelineStage, detail?: string) => void | Promise<void>;
  parse?: ParseManualOptions;
  video?: AnalyzeVideoOptions;
}

/**
 * Creator pipeline: parseManual → analyzeVideo → mergeSources → validate.
 * Manual is source of truth. Video is gap-fill only.
 */
export async function runPipeline(input: RunPipelineInput, opts?: RunPipelineOptions): Promise<RunPipelineOutput> {
  const log: string[] = [];
  const stubbed: string[] = [];
  const guideId = slugify(input.name);
  const notify = async (stage: PipelineStage, detail?: string) => {
    await opts?.onStage?.(stage, detail);
  };

  await notify("parse", "Reading the printed pages…");
  log.push("parseManual");
  const manual = await parseManual(input.name, input.files, {
    ...opts?.parse,
    onProgress: async (detail) => {
      opts?.parse?.onProgress?.(detail);
      await notify("parse", detail);
    },
  });
  log.push(...manual.log);
  stubbed.push(...manual.stubbed);

  const hasVideo = Boolean(input.youtubeUrl?.trim() || input.packagingUrl?.trim());
  await notify("video", hasVideo ? "Filling gaps from manufacturer video…" : "No video — skipping.");
  log.push("analyzeVideo");
  const video = await analyzeVideo(manual, {
    youtubeUrl: input.youtubeUrl,
    packagingUrl: input.packagingUrl,
  }, {
    ...opts?.video,
    onProgress: async (detail) => {
      opts?.video?.onProgress?.(detail);
      await notify("video", detail);
    },
  });
  if (video) {
    log.push(...video.log);
    stubbed.push(...video.stubbed);
  } else {
    log.push("no video locator — skip");
  }

  await notify("merge", hasVideo ? "Keeping the manual; filling gaps from video…" : "Building steps from the manual…");
  log.push("mergeSources (manual wins; video fills gaps; conflicts → review_notes)");
  const guide = mergeSources({
    title: input.name,
    guideId,
    product: manual.product ?? { brand: "Unknown", model: input.name, category: "unspecified" },
    manual,
    video,
  });

  await notify("conflicts", hasVideo ? "Flagging disagreements — the printed page stands." : "Checking the draft against the schema…");
  log.push("validate");
  const valid = assertGuide(guide);
  log.push(`OK ${valid.steps.length} steps, ${valid.parts.length} parts`);

  return { guide: valid, guideId, log, stubbed: unique(stubbed) };
}

export function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return s || `project-${Date.now().toString(36)}`;
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)];
}
