import type { SourcePage } from "../types/guide";
import { decodeImage } from "./imageDecode";
import { extractVision } from "./vision";
import { stepsFromExtract } from "./manualText";
import type { ManualParse, UploadFile, VisionExtract } from "./types";

export interface ParseManualOptions {
  onProgress?: (detail: string) => void | Promise<void>;
  vision?: VisionExtract;
  openaiKey?: string;
  rasterizePdf?: (file: UploadFile, start: number) => Promise<Array<SourcePage & { text?: string }>>;
}

/**
 * parseManual — pages → draft parts/steps.
 *
 * Real work: rasterize PDFs, measure photos, run layout vision, then a provider
 * chain (fixture / OpenAI / text-layer heuristics). Manual stays source of truth.
 */
export async function parseManual(name: string, files: UploadFile[], opts?: ParseManualOptions): Promise<ManualParse> {
  if (!files.length) throw new Error("upload a PDF or at least one page photo");

  const log: string[] = [];
  const stubbed: string[] = [];
  const pages: SourcePage[] = [];
  const pageText = new Map<string, string>();
  const pdfs = files.filter((f) => f.role === "pdf");
  const photos = files.filter((f) => f.role === "photo");

  if (pdfs.length) {
    opts?.onProgress?.("Splitting PDF pages…");
    const raster = opts?.rasterizePdf ?? (await import("./pdfPages")).rasterizePdf;
    for (const pdf of pdfs) {
      try {
        const rasters = await raster(pdf, pages.length);
        for (const r of rasters) {
          pages.push({ page: r.page, label: r.label, image: r.image, width: r.width, height: r.height });
          if (r.text) pageText.set(r.page, r.text);
          log.push(`pdf ${pdf.name} → page ${r.page} (${r.width}×${r.height})${r.text ? " + text layer" : ""}`);
        }
      } catch (err) {
        log.push(`pdf raster failed (${err instanceof Error ? err.message : String(err)}); storing file as a single page`);
        pages.push({
          page: String(pages.length + 1),
          label: pdf.name,
          image: pdf.dataUrl,
          width: 748,
          height: 1075,
        });
        stubbed.push("PDF page rasterization failed in this environment");
      }
    }
  }

  for (const photo of photos) {
    opts?.onProgress?.(`Measuring ${photo.name}…`);
    const size = await measureImage(photo.dataUrl);
    pages.push({
      page: String(pages.length + 1),
      label: photo.name.replace(/\.[^.]+$/, ""),
      image: photo.dataUrl,
      width: size.width,
      height: size.height,
    });
    log.push(`page ${pages.length}: ${photo.name} (${size.width}×${size.height})`);
  }

  if (!pages.length) throw new Error("no pages produced from uploads");

  opts?.onProgress?.("Reading letters, quantities, and figures…");
  const vision = await extractVision(pages, {
    name,
    onProgress: opts?.onProgress,
    inject: opts?.vision,
    openaiKey: opts?.openaiKey,
    pageText,
    fileNames: files.map((f) => f.name),
  });
  log.push(...vision.log);

  const steps = stepsFromExtract(name, vision, pages);
  const notes = vision.mode === "fixture"
    ? "Creator upload. Layout matched a recorded fixture; printed manual is still source of truth."
    : vision.mode === "openai"
      ? "Creator upload. Pages read with a vision model. Printed manual is source of truth."
      : "Creator upload. Pages read locally (PDF text + layout vision). Printed manual is source of truth.";

  return {
    source: {
      type: photos.length && !pdfs.length ? "manual_photos" : "pdf",
      file: pdfs[0]?.name ?? photos[0]?.name ?? null,
      pages,
      missing_pages: [],
      notes,
    },
    parts: vision.parts,
    steps,
    product: vision.product,
    log,
    stubbed,
  };
}

async function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  const decoded = await decodeImage(dataUrl);
  if (decoded && decoded.width >= 1 && decoded.height >= 1) {
    return { width: decoded.width, height: decoded.height };
  }
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(blob);
      const size = { width: bmp.width, height: bmp.height };
      bmp.close();
      if (size.width >= 1 && size.height >= 1) return size;
    }
  } catch {
    // fall through
  }
  return { width: 748, height: 1075 };
}
