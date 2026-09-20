import type { Part, SourcePage, Step } from "../types/guide";
import { narrate } from "./narrate";
import type { ManualParse, UploadFile } from "./types";

const VISION_TODO =
  "TODO: run a vision model on each page to read lettered parts, quantities, step figures, and bboxes. Until then this is a structural draft (one step per page) for the player to load.";

/**
 * parseManual — pages → draft parts/steps.
 *
 * Real work here: turn uploads into SourcePages the player can crop.
 * Stubbed: letter/qty/figure detection (needs a vision model).
 */
export async function parseManual(name: string, files: UploadFile[]): Promise<ManualParse> {
  if (!files.length) throw new Error("upload a PDF or at least one page photo");

  const log: string[] = [];
  const stubbed: string[] = [];
  const pages: SourcePage[] = [];
  const pdfs = files.filter((f) => f.role === "pdf");
  const photos = files.filter((f) => f.role === "photo");

  if (pdfs.length) {
    stubbed.push("PDF page rasterization (pdf.js) + vision parse of each page");
    log.push(`${pdfs.length} PDF(s) stored. Pages are not split yet — ${VISION_TODO}`);
    for (const pdf of pdfs) {
      pages.push({
        page: String(pages.length + 1),
        label: pdf.name,
        image: pdf.dataUrl,
        width: 748,
        height: 1075,
      });
    }
  }

  for (const photo of photos) {
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

  stubbed.push("vision model: parts catalog, letter tags, figure bboxes");
  log.push(VISION_TODO);

  const parts: Part[] = [
    {
      id: "X",
      name: "Parts from the manual (unlabeled until vision parse)",
      qty: 1,
      kind: "component",
      provenance: "generated",
    },
  ];

  const steps: Step[] = pages.map((pg, i) => {
    const last = i === pages.length - 1;
    const title = i === 0 ? "Check the pages" : `Page ${pg.page}`;
    const actions = i === 0
      ? []
      : [{
          verb: "check" as const,
          object: "X",
          detail: `Look at page ${pg.page} of the manual and do what the drawing shows.`,
          provenance: "generated" as const,
        }];
    const checkpoint = last
      ? "The drawing on this page matches what you built."
      : "This page of the manual is done.";
    const step: Step = {
      id: `s${i}`,
      index: i,
      source_label: pg.label ?? null,
      title,
      template: i === 0 ? "parts_overview" : "figure_action",
      parts_used: [{ id: "X", qty: 1 }],
      tools: [],
      actions,
      figure: { page: pg.page, bbox: [0.04, 0.04, 0.96, 0.96], highlights: [] },
      narration: { standard: "…", simple: "…" },
      warnings: [],
      tips: [],
      options: null,
      checkpoint,
      estimated_seconds: 12,
      review_notes: [{
        kind: "uncertainty",
        text: i === 0
          ? "Parts catalog is a placeholder. Vision parse must read lettered parts from the manual."
          : "Figure bbox is the full page. Vision parse must crop to the printed step drawing.",
      }],
    };
    step.narration = narrate(step);
    return step;
  });

  // A single-page upload still needs a playable figure_action clip.
  if (steps.length === 1) {
    steps[0].template = "figure_action";
    steps[0].title = name.slice(0, 80) || "Follow the manual";
    steps[0].actions = [{
      verb: "check",
      object: "X",
      detail: "Look at the uploaded page and follow the drawing.",
      provenance: "generated",
    }];
    steps[0].narration = narrate(steps[0]);
  }

  return {
    source: {
      type: photos.length && !pdfs.length ? "manual_photos" : "pdf",
      file: pdfs[0]?.name ?? photos[0]?.name ?? null,
      pages,
      missing_pages: [],
      notes: "Creator upload. Manual is source of truth; vision parse has not run.",
    },
    parts,
    steps,
    log,
    stubbed,
  };
}

async function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
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
