import { fetchPipelineJson } from "../lib/pipelineApi";
import { shouldSkipLivePipelineApis } from "../lib/staticHost";
import { openaiApiKey, openaiVisionModel } from "./env";
import type { Action, Part, Product, Verb } from "../types/guide";
import type { SourcePage } from "../types/guide";
import type { VisionExtract, VisionPageExtract } from "./types";

const VERBS: Verb[] = ["flip", "place", "insert", "slide", "press", "snap", "fasten", "tighten", "choose", "remove", "rotate", "check"];

export async function openaiVisionExtract(pages: SourcePage[], name: string, keyOverride?: string): Promise<VisionExtract | null> {
  const key = openaiApiKey(keyOverride);
  // Pages / missing pipeline: do not POST huge page images at a 404 that can hang.
  if (shouldSkipLivePipelineApis()) return null;

  const body = {
    name,
    pages: pages.map((p) => ({ page: p.page, label: p.label, image: p.image })),
  };

  // Dev server proxy keeps the key off the client bundle.
  const viaProxy = await fetchPipelineJson("/api/pipeline/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 8000);
  if (viaProxy) return normalize(viaProxy, "openai");

  if (!key) return null;
  const direct = await callOpenAI(pages, name, key);
  return direct ? normalize(direct, "openai") : null;
}

export async function callOpenAI(pages: SourcePage[], name: string, key: string): Promise<unknown | null> {
  const model = openaiVisionModel();
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `Extract an assembly-manual parse as JSON. Project name: ${name}.
Return {
  "product": {"brand": string, "model": string, "category": string},
  "parts": [{"id": "A", "name": string, "qty": number, "kind": "component"|"fastener"|"tool"}],
  "pages": [{"page": string, "role": "cover"|"parts"|"step"|"warning"|"other", "source_label": string|null, "title": string|null, "bbox": [x0,y0,x1,y1], "warnings": string[], "actions": [{"verb": string, "object": string, "target": string|null, "qty": number|null, "detail": string}], "parts_used": [{"id": string, "qty": number}]}]
}
Rules: id is the printed letter. bbox is normalized 0-1 on that page image. Prefer printed text over guessing. One printed step number per page entry (split a 2x2 sheet into four entries that share the same page with different bboxes).`,
    },
  ];
  for (const p of pages.slice(0, 8)) {
    content.push({ type: "text", text: `Page key ${p.page} (${p.label ?? ""})` });
    content.push({ type: "image_url", image_url: { url: p.image, detail: "low" } });
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You read assembly manuals. JSON only. Never invent letters that are not on the page." },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalize(raw: unknown, mode: VisionExtract["mode"]): VisionExtract | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const partsIn = Array.isArray(o.parts) ? o.parts : [];
  const pagesIn = Array.isArray(o.pages) ? o.pages : [];
  if (!partsIn.length && !pagesIn.length) return null;
  const parts: Part[] = [];
  for (const p of partsIn) {
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    const id = String(r.id ?? "").trim().slice(0, 8);
    if (!id) continue;
    const kind = r.kind === "fastener" || r.kind === "tool" ? r.kind : "component";
    parts.push({
      id,
      name: String(r.name ?? `Part ${id}`).slice(0, 80) || `Part ${id}`,
      qty: Math.max(1, Number(r.qty) || 1),
      kind,
      provenance: "manual",
    });
  }
  const pages: VisionPageExtract[] = [];
  for (const p of pagesIn) {
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    const page = String(r.page ?? "");
    if (!page) continue;
    const role = r.role === "cover" || r.role === "parts" || r.role === "step" || r.role === "warning" ? r.role : "other";
    const bbox = Array.isArray(r.bbox) ? r.bbox.map(Number) : null;
    const box = bbox && bbox.length === 4 && bbox.every((n) => n >= 0 && n <= 1) && bbox[2] > bbox[0] && bbox[3] > bbox[1]
      ? bbox as [number, number, number, number]
      : undefined;
    const actions: Action[] = [];
    if (Array.isArray(r.actions)) {
      for (const a of r.actions) {
        if (!a || typeof a !== "object") continue;
        const ar = a as Record<string, unknown>;
        const verb = VERBS.includes(ar.verb as Verb) ? ar.verb as Verb : "check";
        const object = String(ar.object ?? parts[0]?.id ?? "X");
        const detail = String(ar.detail ?? "").slice(0, 240);
        if (!detail) continue;
        actions.push({
          verb,
          object,
          target: ar.target ? String(ar.target) : null,
          qty: ar.qty != null ? Number(ar.qty) || null : null,
          detail,
          provenance: "manual",
        });
      }
    }
    pages.push({
      page,
      role,
      source_label: r.source_label != null ? String(r.source_label) : null,
      title: r.title != null ? String(r.title).slice(0, 80) : null,
      bbox: box,
      warnings: Array.isArray(r.warnings) ? r.warnings.map((w) => String(w).slice(0, 240)) : [],
      actions,
      parts_used: Array.isArray(r.parts_used)
        ? (r.parts_used as Array<Record<string, unknown>>).map((u) => ({ id: String(u.id ?? ""), qty: Math.max(1, Number(u.qty) || 1) })).filter((u) => u.id)
        : [],
    });
  }
  let product: Product | undefined;
  if (o.product && typeof o.product === "object") {
    const p = o.product as Record<string, unknown>;
    product = {
      brand: String(p.brand ?? "Unknown"),
      model: String(p.model ?? "Unknown"),
      category: String(p.category ?? "unspecified"),
    };
  }
  return {
    mode,
    product,
    parts,
    pages,
    log: [`openai vision: ${parts.length} parts, ${pages.length} page extracts`],
  };
}
