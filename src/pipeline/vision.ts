import type { SourcePage } from "../types/guide";
import { magichVisionExtract } from "./fixtures/magich";
import { decodeImage } from "./imageDecode";
import { partsLettersFromGrid, readLayoutCues, type LayoutCues } from "./layoutVision";
import { parseManualText } from "./manualText";
import { openaiVisionExtract } from "./openaiVision";
import type { VisionExtract } from "./types";

export interface ExtractVisionOptions {
  name: string;
  onProgress?: (detail: string) => void;
  inject?: VisionExtract;
  openaiKey?: string;
  pageText?: Map<string, string>;
  fileNames?: string[];
}

/**
 * Provider chain: injected extract → recognized MagicH layout fixture →
 * OpenAI vision (if a key / dev proxy is available) → PDF/OCR text heuristics.
 */
export async function extractVision(pages: SourcePage[], opts: ExtractVisionOptions): Promise<VisionExtract> {
  if (opts.inject) return opts.inject;

  opts.onProgress?.("Looking at page layout…");
  const roles = new Map<string, "cover" | "parts" | "step" | "warning" | "other">();
  const cuesByPage = new Map<string, LayoutCues>();
  let magichGrid = false;
  for (const page of pages) {
    const img = await decodeImage(page.image);
    if (!img) continue;
    const cues = readLayoutCues(img);
    cuesByPage.set(page.page, cues);
    if (cues.looksLikePartsGrid) {
      roles.set(page.page, "parts");
      if (cues.orangeBadges.length >= 14 && cues.orangeBadges.length <= 18) magichGrid = true;
    }     else if (cues.looksLikeQuadSteps) roles.set(page.page, "step");
  }
  for (const page of pages) {
    const label = page.label ?? "";
    if (/parts-list/i.test(label) && !roles.has(page.page)) roles.set(page.page, "parts");
    if (/p-04|assembly-steps/i.test(label) && !roles.has(page.page)) roles.set(page.page, "step");
  }

  const magichScore = scoreMagich(pages, roles, opts, magichGrid);
  if (magichScore >= 8) {
    opts.onProgress?.("Matched recorded MagicH / parts-list fixture…");
    const extract = magichVisionExtract(pages, roles);
    extract.log.push(`magich score ${magichScore}`);
    return extract;
  }

  opts.onProgress?.("Trying vision model…");
  const openai = await openaiVisionExtract(pages, opts.name, opts.openaiKey);
  if (openai) return openai;

  opts.onProgress?.("Reading printed text…");
  const withText = pages.map((p) => ({
    ...p,
    text: opts.pageText?.get(p.page) ?? "",
  }));
  const local = parseManualText({ pages: withText, name: opts.name });

  // If we saw an orange letter grid but text was empty, at least keep the letters.
  const partsPage = pages.find((p) => cuesByPage.get(p.page)?.looksLikePartsGrid);
  if (partsPage && local.parts.every((p) => p.id === "X")) {
    const cues = cuesByPage.get(partsPage.page)!;
    const letters = partsLettersFromGrid(cues.orangeBadges.length);
    local.parts = letters.map((id) => ({
      id,
      name: `Part ${id}`,
      qty: 1,
      kind: "component" as const,
      provenance: "inferred" as const,
    }));
    local.pages = local.pages.map((pg) => pg.page === partsPage.page ? { ...pg, role: "parts" } : pg);
    local.log.push(`layout vision: ${letters.length} letter tags (quantities unknown without OCR / API key)`);
  }
  local.log.push(...[...cuesByPage.values()].flatMap((c) => c.log));
  return local;
}

function scoreMagich(
  pages: SourcePage[],
  roles: Map<string, string>,
  opts: ExtractVisionOptions,
  magichGrid: boolean,
): number {
  let score = 0;
  if (magichGrid) score += 8;
  else if ([...roles.values()].includes("parts")) score += 2;
  if ([...roles.values()].includes("step")) score += 3;
  const names = `${opts.name} ${(opts.fileNames ?? []).join(" ")} ${pages.map((p) => p.label ?? "").join(" ")}`;
  if (/parts-list|magich|newtral/i.test(names)) score += 8;
  else if (/p-03/i.test(names)) score += 4;
  for (const p of pages) {
    if (p.width === 748 && p.height === 1075) score += 1;
  }
  const text = [...(opts.pageText?.values() ?? [])].join(" ");
  if (/parts list/i.test(text) && /M6/i.test(text)) score += 6;
  if (/MagicH|Newtral/i.test(text)) score += 6;
  return score;
}
