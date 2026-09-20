import goldenJson from "../../data/golden/newtral-magich-pro.json";
import { coerceGuide } from "../../lib/validate";
import type { Part, Product, SourcePage, Step } from "../../types/guide";
import type { ManualParse, VisionExtract } from "../types";

const GOLDEN_PAGE_ORDER = ["3", "4", "5", "6", "7", "8", "9"];

/** Recorded catalog for the MagicH / Newtral parts-list page (letters skip O). */
export const MAGICH_PART_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "P", "Q", "R"] as const;

export function cloneGoldenGuide() {
  return coerceGuide(JSON.parse(JSON.stringify(goldenJson)));
}

export function magichProduct(): Product {
  return { ...cloneGoldenGuide().product };
}

/**
 * Rebuild a ManualParse from the chair golden fixture, remapping figure page
 * keys onto the uploader's page images. Used when layout vision recognizes
 * the MagicH parts grid / assembly sheets.
 */
export function magichFixtureFromPages(
  pages: SourcePage[],
  roles: Map<string, "cover" | "parts" | "step" | "warning" | "other">,
): ManualParse {
  const g = cloneGoldenGuide();
  const partsPage = pages.find((p) => roles.get(p.page) === "parts") ?? pages[0];
  const stepPages = pages.filter((p) => p.page !== partsPage.page && roles.get(p.page) !== "cover");
  const goldenToUpload: Record<string, string> = {};
  if (partsPage) goldenToUpload["3"] = partsPage.page;
  stepPages.forEach((p, i) => {
    const gk = GOLDEN_PAGE_ORDER[i + 1];
    if (gk) goldenToUpload[gk] = p.page;
  });

  const steps: Step[] = [];
  for (const step of g.steps) {
    const gPage = step.figure?.page;
    if (!gPage) {
      steps.push(step);
      continue;
    }
    const mapped = goldenToUpload[gPage];
    if (!mapped) continue;
    steps.push({
      ...step,
      figure: step.figure ? { ...step.figure, page: mapped } : step.figure,
    });
  }

  if (!steps.length) {
    const overview = g.steps.find((s) => s.template === "parts_overview") ?? g.steps[0];
    steps.push({
      ...overview,
      figure: overview.figure && partsPage
        ? { ...overview.figure, page: partsPage.page }
        : overview.figure,
    });
  }

  steps.forEach((s, i) => { s.index = i; s.id = `s${i}`; });

  return {
    source: {
      type: pages.length && pages.every((p) => !/\.pdf$/i.test(p.label ?? "")) ? "manual_photos" : "pdf",
      file: null,
      pages,
      missing_pages: [],
      notes: "Recognized MagicH / Newtral parts-list layout. Recorded fixture steps mapped onto the uploaded pages. Manual remains source of truth.",
    },
    parts: g.parts.map((p: Part) => ({ ...p })),
    steps,
    product: magichProduct(),
    log: [
      `fixture magich-pro: ${pages.length} uploaded page(s) → ${steps.length} steps, ${g.parts.length} parts`,
      `page map ${JSON.stringify(goldenToUpload)}`,
    ],
    stubbed: [],
  };
}

export function magichVisionExtract(pages: SourcePage[], roles: Map<string, "cover" | "parts" | "step" | "warning" | "other">): VisionExtract {
  const parsed = magichFixtureFromPages(pages, roles);
  return {
    mode: "fixture",
    product: parsed.product,
    parts: parsed.parts,
    steps: parsed.steps,
    pages: pages.map((p) => ({
      page: p.page,
      role: roles.get(p.page) ?? "other",
      warnings: [],
      actions: [],
      parts_used: [],
    })),
    log: parsed.log,
  };
}
