import type { Action, Part, PartKind, Product, Provenance, SourcePage, Step, Verb } from "../types/guide";
import { narrate } from "./narrate";
import type { VisionExtract, VisionPageExtract } from "./types";

const VERBS: Verb[] = ["flip", "place", "insert", "slide", "press", "snap", "fasten", "tighten", "choose", "remove", "rotate", "check"];

const TOOL_WORDS = /\b(hex key|allen key|screwdriver|wrench|spanner|hammer)\b/i;
const FASTENER_WORDS = /\b(bolt|screw|nut|washer|knob|fastener)\b/i;

/**
 * Turn PDF-text-layer / OCR strings into parts + step drafts.
 * This is the no-key parse path when a vision model is not configured.
 */
export function parseManualText(input: {
  pages: Array<SourcePage & { text?: string }>;
  name: string;
}): VisionExtract {
  const log: string[] = [];
  const allText = input.pages.map((p) => p.text ?? "").join("\n");
  const parts = extractParts(allText);
  if (parts.length) log.push(`text parse: ${parts.length} lettered parts`);
  else log.push("text parse: no lettered parts with quantities");

  const pageExtracts: VisionPageExtract[] = input.pages.map((p) => extractPage(p, parts));
  const product = inferProduct(allText, input.name);

  return {
    mode: "local",
    product,
    parts: parts.length ? parts : [{
      id: "X",
      name: "Unlabeled part (text layer had no letter/qty tags)",
      qty: 1,
      kind: "component",
      provenance: "generated",
    }],
    pages: pageExtracts,
    log,
  };
}

export function extractParts(text: string): Part[] {
  const found = new Map<string, Part>();
  const qtyRe = /\b([A-Z])\b(?:(?!\b[A-Z]\b).){0,80}?(\d+)\s*(PCS|PC|SET)S?\b/gis;
  let m: RegExpExecArray | null;
  while ((m = qtyRe.exec(text)) !== null) {
    const id = m[1];
    const qty = Math.max(1, parseInt(m[2], 10));
    const unit = m[3].toUpperCase();
    const around = text.slice(Math.max(0, m.index - 24), Math.min(text.length, m.index + m[0].length + 48));
    const size = around.match(/M\s*(\d+)\s*[x×*]\s*(\d+)\s*mm/i);
    const kind: PartKind = TOOL_WORDS.test(around) ? "tool"
      : (FASTENER_WORDS.test(around) || size) ? "fastener"
      : unit === "SET" && /armrest|cover/i.test(around) ? "component"
      : size ? "fastener"
      : "component";
    const name = size
      ? `Bolt M${size[1]}x${size[2]}mm`
      : guessPartName(id, around);
    const provenance: Provenance = size || /part/i.test(around) ? "manual" : "inferred";
    if (!found.has(id)) {
      found.set(id, { id, name, qty: unit === "SET" && qty === 1 ? guessSetQty(around, qty) : qty, kind, provenance });
    }
  }
  // Spare note often lives in the header; leave qty as printed.
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function guessSetQty(window: string, qty: number): number {
  const n = window.match(/set of\s*(\d+)/i);
  return n ? parseInt(n[1], 10) : qty;
}

function guessPartName(id: string, window: string): string {
  const named = window.match(new RegExp(`${id}\\s+([A-Z][a-z]+(?:\\s+[a-z]+){0,3})`));
  if (named?.[1] && !/^(PC|PCS|SET|User|Step)$/i.test(named[1])) return named[1];
  if (/hex|allen/i.test(window)) return "Hex key";
  if (/caster|wheel/i.test(window)) return "Caster";
  if (/gas lift|cylinder/i.test(window)) return "Gas lift";
  return `Part ${id}`;
}

function extractPage(page: SourcePage & { text?: string }, parts: Part[]): VisionPageExtract {
  const text = page.text ?? "";
  const warnings = [...text.matchAll(/\b(WARNING|CAUTION|DANGER|NOTE)\b[:\s-]*([^\n]{3,180})/gi)]
    .map((m) => `${m[1]}: ${m[2].trim()}`.slice(0, 240));

  const isParts = /parts list|bill of materials|what.?s in the box/i.test(text) || countPartHits(text) >= 6;
  const stepHits = [...text.matchAll(/step\s*(\d+)\s*[:.\s-]*([^\n]{0,80})/gi)];
  const isCover = /user manual|instruction manual/i.test(text) && !isParts && stepHits.length === 0;

  let role: VisionPageExtract["role"] = "other";
  if (isParts) role = "parts";
  else if (stepHits.length) role = "step";
  else if (warnings.length && !stepHits.length) role = "warning";
  else if (isCover) role = "cover";

  const actions: Action[] = [];
  const parts_used: { id: string; qty: number }[] = [];
  const catalog = new Set(parts.map((p) => p.id));
  const title = stepHits[0]?.[2]?.trim().replace(/\s+/g, " ").slice(0, 80)
    || (isParts ? "Check your parts" : undefined);

  if (role === "step") {
    const used = lettersIn(text, catalog);
    for (const id of used) parts_used.push({ id, qty: 1 });
    const verb = inferVerb(text);
    const object = used[0] ?? parts[0]?.id ?? "X";
    actions.push({
      verb,
      object,
      detail: firstSentence(text, title) || `Follow the drawing for ${title ?? `page ${page.page}`}.`,
      provenance: "manual",
    });
  }

  return {
    page: page.page,
    role,
    source_label: stepHits[0] ? `Step ${stepHits[0][1]}` : page.label ?? null,
    title: title ?? null,
    bbox: role === "parts" ? [0.05, 0.11, 0.95, 0.94] : [0.05, 0.12, 0.95, 0.92],
    warnings,
    actions,
    parts_used,
    text,
  };
}

function countPartHits(text: string): number {
  return new Set([...text.matchAll(/\b([A-Z])\b(?:(?!\b[A-Z]\b).){0,40}?\d+\s*(PCS|PC|SET)/gis)].map((m) => m[1])).size;
}

function lettersIn(text: string, catalog: Set<string>): string[] {
  const hits: string[] = [];
  for (const id of catalog) {
    const re = new RegExp(`\\b${id}\\b`);
    if (re.test(text)) hits.push(id);
  }
  return hits;
}

export function inferVerb(text: string): Verb {
  const t = text.toLowerCase();
  for (const v of VERBS) {
    if (t.includes(v)) return v;
  }
  if (/\battach|bolt|secure|install\b/.test(t)) return "fasten";
  if (/\bput|set|rest\b/.test(t)) return "place";
  if (/\bpush|seat\b/.test(t)) return "press";
  if (/\bturn|spin\b/.test(t)) return "rotate";
  return "check";
}

function firstSentence(text: string, fallback?: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/[^.!?]{12,180}[.!?]/);
  return (m?.[0] ?? fallback ?? cleaned).slice(0, 240);
}

function inferProduct(text: string, name: string): Product {
  const brand = text.match(/\b(Newtral|IKEA|HON|Steelcase|Herman Miller)\b/i)?.[1];
  const model = text.match(/\b(MagicH[-\w]*|Magic\s*H[-\w]*)\b/i)?.[1];
  return {
    brand: brand ?? "Unknown",
    model: model ?? name,
    category: /chair/i.test(text) ? "office chair" : "unspecified",
  };
}

/** Build playable steps from vision page extracts. */
export function stepsFromExtract(name: string, extract: VisionExtract, pages: SourcePage[]): Step[] {
  if (extract.steps?.length) return extract.steps;
  const parts = extract.parts;
  const fallbackId = parts[0]?.id ?? "X";
  const extracts = extract.pages;
  const out: Step[] = [];

  const partsPages = extracts.filter((p) => p.role === "parts");
  const stepPages = extracts.filter((p) => p.role === "step");
  const other = extracts.filter((p) => p.role !== "parts" && p.role !== "cover");

  if (partsPages.length || extracts.length) {
    const pg = partsPages[0] ?? extracts[0];
    const src = pages.find((p) => p.page === pg.page) ?? pages[0];
    const overview: Step = {
      id: "s0",
      index: 0,
      source_label: src?.label ?? null,
      title: "Check your parts",
      template: "parts_overview",
      parts_used: parts.filter((p) => p.id !== "X").map((p) => ({ id: p.id, qty: Math.min(p.qty, p.qty) })),
      tools: parts.filter((p) => p.kind === "tool").map((p) => p.id),
      actions: [],
      figure: src ? { page: src.page, bbox: pg.bbox ?? [0.05, 0.11, 0.95, 0.94], highlights: [] } : null,
      narration: { standard: "…", simple: "…" },
      warnings: pg.warnings.map((t) => ({ text: t.slice(0, 240), provenance: "manual" as const })),
      tips: spareTip(extract),
      options: null,
      checkpoint: "Every part on the list is present.",
      estimated_seconds: 12,
      review_notes: parts.some((p) => p.id === "X")
        ? [{ kind: "uncertainty", text: "Parts catalog is incomplete. Check letter tags on the printed page." }]
        : [],
    };
    overview.narration = narrate(overview);
    out.push(overview);
  }

  const actionSources = stepPages.length ? stepPages : other.filter((p) => p.role !== "warning");
  const quad = actionSources.length === 1 && /step\s*1/i.test(actionSources[0].text ?? "") && /step\s*4/i.test(actionSources[0].text ?? "");
  if (quad) {
    out.push(...quadStepsFromPage(actionSources[0], pages, parts, fallbackId, out.length));
  } else {
    actionSources.forEach((pg, i) => {
      const src = pages.find((p) => p.page === pg.page);
      if (!src) return;
      const idx = out.length;
      const actions = pg.actions.length
        ? pg.actions.map((a) => ({ ...a, object: a.object || fallbackId, provenance: a.provenance ?? "manual" as const }))
        : [{
            verb: "check" as const,
            object: fallbackId,
            detail: pg.title ? `Follow the drawing: ${pg.title}.` : `Look at page ${src.page} and do what the drawing shows.`,
            provenance: "manual" as const,
          }];
      const step: Step = {
        id: `s${idx}`,
        index: idx,
        source_label: pg.source_label ?? src.label ?? null,
        title: (pg.title || `Page ${src.page}`).slice(0, 80),
        template: "figure_action",
        parts_used: pg.parts_used.length ? pg.parts_used : [{ id: fallbackId, qty: 1 }],
        tools: parts.filter((p) => p.kind === "tool").map((p) => p.id),
        actions,
        figure: { page: src.page, bbox: pg.bbox ?? [0.05, 0.12, 0.95, 0.92], highlights: [] },
        narration: { standard: "…", simple: "…" },
        warnings: pg.warnings.map((t) => ({ text: t.slice(0, 240), provenance: "manual" as const })),
        tips: [],
        options: null,
        checkpoint: "The drawing on this page matches what you built.",
        estimated_seconds: 14,
        review_notes: pg.bbox ? [] : [{ kind: "uncertainty", text: "Figure crop is the page content area; confirm against the printed frame." }],
      };
      step.narration = narrate(step);
      out.push(step);
      void i;
    });
  }

  if (out.length === 1 && out[0].template === "parts_overview" && pages.length === 1) {
    // playable single-page guide: keep overview; player allows parts_overview
  }

  if (!out.length) {
    const src = pages[0];
    const step: Step = {
      id: "s0",
      index: 0,
      title: (name || "Follow the manual").slice(0, 80),
      template: "figure_action",
      parts_used: [{ id: fallbackId, qty: 1 }],
      tools: [],
      actions: [{
        verb: "check",
        object: fallbackId,
        detail: "Look at the uploaded page and follow the drawing.",
        provenance: "generated",
      }],
      figure: { page: src.page, bbox: [0.04, 0.04, 0.96, 0.96], highlights: [] },
      narration: { standard: "…", simple: "…" },
      warnings: [],
      tips: [],
      options: null,
      checkpoint: "The drawing matches what you built.",
      estimated_seconds: 12,
      review_notes: [{ kind: "uncertainty", text: "No step numbers found. Crop is the full page." }],
    };
    step.narration = narrate(step);
    out.push(step);
  }

  return out;
}

function spareTip(extract: VisionExtract): { text: string; provenance: "manual" | "inferred" }[] {
  const blob = extract.pages.map((p) => p.text ?? "").join(" ");
  if (/spare/i.test(blob)) return [{ text: "Each screw type ships with one spare.", provenance: "manual" }];
  return [];
}

function quadStepsFromPage(pg: VisionPageExtract, pages: SourcePage[], parts: Part[], fallbackId: string, startIndex: number): Step[] {
  const src = pages.find((p) => p.page === pg.page);
  if (!src) return [];
  const blocks = splitStepBlocks(pg.text ?? "");
  const bboxes: [number, number, number, number][] = [
    [0.056, 0.185, 0.5, 0.532],
    [0.5, 0.185, 0.944, 0.532],
    [0.056, 0.59, 0.5, 0.935],
    [0.5, 0.59, 0.944, 0.935],
  ];
  const catalog = new Set(parts.map((p) => p.id));
  return blocks.slice(0, 4).map((block, i) => {
    const used = lettersIn(block.body, catalog);
    const object = used[0] ?? fallbackId;
    const step: Step = {
      id: `s${startIndex + i}`,
      index: startIndex + i,
      source_label: `Step ${block.n}`,
      title: (block.title || `Step ${block.n}`).slice(0, 80),
      template: "figure_action",
      parts_used: used.length ? used.map((id) => ({ id, qty: 1 })) : [{ id: fallbackId, qty: 1 }],
      tools: parts.filter((p) => p.kind === "tool").map((p) => p.id),
      actions: [{
        verb: inferVerb(block.body + " " + block.title),
        object,
        detail: `${block.title}. Follow the drawing and the printed part letters.`.slice(0, 240),
        provenance: "manual",
      }],
      figure: { page: src.page, bbox: bboxes[i] ?? [0.05, 0.12, 0.95, 0.92], highlights: [] },
      narration: { standard: "…", simple: "…" },
      warnings: [],
      tips: [],
      options: null,
      checkpoint: "This printed step matches what you built.",
      estimated_seconds: 14,
      review_notes: [],
    };
    step.narration = narrate(step);
    return step;
  });
}

function splitStepBlocks(text: string): Array<{ n: number; title: string; body: string }> {
  const re = /step\s*(\d+)\s*([^\n]*)/gi;
  const hits = [...text.matchAll(re)];
  if (!hits.length) return [];
  return hits.map((m, i) => {
    const start = m.index ?? 0;
    const end = hits[i + 1]?.index ?? text.length;
    const title = (m[2] || "").replace(/assembling/i, "").trim() || `Step ${m[1]}`;
    return { n: parseInt(m[1], 10), title: title.slice(0, 80), body: text.slice(start, end) };
  });
}
