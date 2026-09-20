import { assertGuide } from "../lib/validate";
import { analyzeVideo } from "./analyzeVideo";
import { mergeSources } from "./mergeSources";
import { parseManual } from "./parseManual";
import type { PipelineResult, UploadFile } from "./types";
import type { Guide } from "../types/guide";

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
  onStage?: (stage: PipelineStage) => void | Promise<void>;
}

/**
 * Creator pipeline: parseManual → analyzeVideo → mergeSources → validate.
 * Manual is source of truth. Video is gap-fill only.
 */
export async function runPipeline(input: RunPipelineInput, opts?: RunPipelineOptions): Promise<RunPipelineOutput> {
  const log: string[] = [];
  const stubbed: string[] = [];
  const guideId = slugify(input.name);
  const notify = async (stage: PipelineStage) => {
    await opts?.onStage?.(stage);
  };

  await notify("parse");
  log.push("parseManual");
  const manual = await parseManual(input.name, input.files);
  log.push(...manual.log);
  stubbed.push(...manual.stubbed);

  await notify("video");
  log.push("analyzeVideo");
  const video = analyzeVideo(manual, {
    youtubeUrl: input.youtubeUrl,
    packagingUrl: input.packagingUrl,
  });
  if (video) {
    log.push(...video.log);
    stubbed.push(...video.stubbed);
  } else {
    log.push("no video locator — skip");
  }

  await notify("merge");
  log.push("mergeSources (manual wins; video fills gaps; conflicts → review_notes)");
  const guide = mergeSources({
    title: input.name,
    guideId,
    product: { brand: "Unknown", model: input.name, category: "unspecified" },
    manual,
    video,
  });

  await notify("conflicts");
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
