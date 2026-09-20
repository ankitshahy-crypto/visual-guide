import type { Guide, ReviewNote, Sources, Step } from "../types/guide";

const SUPPORTED = new Set(["0.1", "0.2"]);

/** Lift v0.1 source/review_notes shapes so the player and pipeline share one Guide type. */
export function coerceGuide(raw: unknown): Guide {
  if (!raw || typeof raw !== "object") throw new Error("guide JSON is empty");
  const g = { ...(raw as Record<string, unknown>) };
  const src = g.source as Record<string, unknown> | undefined;
  if (src && !("manual" in src) && ("pages" in src || "type" in src)) {
    g.source = { manual: src } as unknown as Sources;
  }
  if (Array.isArray(g.steps)) {
    g.steps = (g.steps as Record<string, unknown>[]).map((s) => ({
      ...s,
      review_notes: coerceNotes(s.review_notes),
    }));
  }
  return g as unknown as Guide;
}

function coerceNotes(raw: unknown): ReviewNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { kind: "uncertainty" as const, text: item };
    return item as ReviewNote;
  });
}

/** Runtime checks mirroring schema.py Guide.cross_checks. Throws if the JSON is not a valid Guide. */
export function assertGuide(raw: unknown): Guide {
  const guide = coerceGuide(raw);
  if (!SUPPORTED.has(guide.schema_version)) {
    throw new Error(`unsupported schema_version '${guide.schema_version}'`);
  }
  if (!guide.steps?.length) throw new Error("guide must have at least one step");
  if (!guide.parts?.length) throw new Error("guide must have a parts catalog");
  if (!guide.source?.manual) throw new Error("guide.source.manual is required");

  const partIds = new Set(guide.parts.map((p) => p.id));
  if (partIds.size !== guide.parts.length) throw new Error("duplicate part ids");
  const partsById = Object.fromEntries(guide.parts.map((p) => [p.id, p]));
  const toolIds = new Set(guide.parts.filter((p) => p.kind === "tool").map((p) => p.id));
  const pageKeys = new Set(guide.source.manual.pages.map((p) => p.page));

  const indices = guide.steps.map((s) => s.index);
  const start = indices[0];
  if (start !== 0 && start !== 1) throw new Error("step indices must start at 0 or 1");
  if (indices.some((n, i) => n !== start + i)) throw new Error("step indices must be contiguous");

  const stepIds = guide.steps.map((s) => s.id);
  if (new Set(stepIds).size !== stepIds.length) throw new Error("duplicate step ids");

  if (guide.source.video) {
    const v = guide.source.video;
    if (!v.youtube_url && !v.packaging_url && !v.file) {
      throw new Error("video source needs youtube_url, packaging_url, or file");
    }
  }

  for (const s of guide.steps) {
    checkStepShape(s);
    for (const ref of s.parts_used) {
      if (!partIds.has(ref.id)) throw new Error(`${s.id}: unknown part '${ref.id}'`);
      if (ref.qty > partsById[ref.id].qty) {
        throw new Error(`${s.id}: uses ${ref.qty} of part '${ref.id}' but only ${partsById[ref.id].qty} exist`);
      }
    }
    for (const t of s.tools) {
      if (!toolIds.has(t)) throw new Error(`${s.id}: '${t}' is not a tool`);
    }
    for (const a of s.actions) {
      for (const pid of [a.object, a.target, a.tool]) {
        if (pid != null && !partIds.has(pid)) throw new Error(`${s.id}: action references unknown part '${pid}'`);
      }
      if (a.tool != null && !toolIds.has(a.tool)) throw new Error(`${s.id}: action tool '${a.tool}' is not a tool`);
      if (a.qty != null && a.object in partsById && a.qty > partsById[a.object].qty) {
        throw new Error(`${s.id}: action uses ${a.qty} of '${a.object}'`);
      }
    }
    if (s.figure != null && !pageKeys.has(s.figure.page)) {
      throw new Error(`${s.id}: figure page '${s.figure.page}' not in source pages`);
    }
  }

  return guide;
}

function checkStepShape(s: Step): void {
  if (!s.narration?.standard || !s.narration?.simple) {
    throw new Error(`${s.id}: both standard and simple narration are required`);
  }
  if ((s.template === "figure_action" || s.template === "options") && s.figure == null) {
    throw new Error(`${s.id}: template ${s.template} requires a figure`);
  }
  if (s.template === "options" && s.options == null) {
    throw new Error(`${s.id}: template 'options' requires options`);
  }
  if (s.template !== "options" && s.options != null) {
    throw new Error(`${s.id}: options only allowed on template 'options'`);
  }
  if (s.template === "figure_action" && s.actions.length === 0) {
    throw new Error(`${s.id}: figure_action step must have at least one action`);
  }
  if (s.options?.default != null && !s.options.choices.some((c) => c.id === s.options!.default)) {
    throw new Error(`${s.id}: options.default must match a choice id`);
  }
}
