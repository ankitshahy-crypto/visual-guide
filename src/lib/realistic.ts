import type { Guide } from "../types/guide";
import bundled from "../data/realistic-index.json";
import { publicUrl } from "./publicUrl";

/** Sidecar to the guide. The manual JSON stays the source of truth for actions, letters, and checkpoints. */
export interface RealisticIndex {
  version: number;
  guide_id: string;
  provider: string;
  note?: string;
  generatedAt?: string;
  /** Which finished-product photo the stills were grounded on. The player does not read this. */
  product_reference?: {
    source: "manual-cover" | "catalog-fetch" | "user-upload" | "none";
    page?: string;
    image?: string;
    detail?: string;
  };
  steps: Record<string, string>;
  parts: Record<string, string>;
}

export const bundledRealisticIndex = bundled as RealisticIndex;

function fileFor(guide: Guide, table: Record<string, string>, id: string): string | null {
  if (guide.guide_id !== bundledRealisticIndex.guide_id) return null;
  const file = table[id];
  return file ? file : null;
}

/** Path relative to `public/`, or null when this guide/step has no generated still. */
export function realisticStepFile(guide: Guide, stepId: string): string | null {
  return fileFor(guide, bundledRealisticIndex.steps, stepId);
}

export function realisticPartFile(guide: Guide, partId: string): string | null {
  return fileFor(guide, bundledRealisticIndex.parts, partId);
}

export function realisticStepSrc(guide: Guide, stepId: string): string | null {
  const file = realisticStepFile(guide, stepId);
  return file ? publicUrl(file) : null;
}

export function realisticPartSrc(guide: Guide, partId: string): string | null {
  const file = realisticPartFile(guide, partId);
  return file ? publicUrl(file) : null;
}
