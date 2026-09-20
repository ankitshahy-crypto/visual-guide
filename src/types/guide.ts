// Mirrors schema.py (v0.1). Keep the two in sync by hand until we generate one from the other.

export type ContentModel = "procedural" | "expository";
export type Template = "parts_overview" | "figure_action" | "options" | "caution";
export type PartKind = "component" | "fastener" | "tool";
export type Provenance = "manual" | "inferred" | "generated";
export type Verb =
  | "flip" | "place" | "insert" | "slide" | "press" | "snap"
  | "fasten" | "tighten" | "choose" | "remove" | "rotate" | "check";
export type Direction =
  | "up" | "down" | "left" | "right" | "in" | "out" | "clockwise" | "counterclockwise";

export type NarrationLevel = "standard" | "simple";

export interface Product { brand: string; model: string; category: string }

export interface SourcePage {
  page: string;
  label?: string | null;
  image: string;
  width?: number | null;
  height?: number | null;
}

export interface Source {
  type: string;
  file?: string | null;
  pages: SourcePage[];
  missing_pages: string[];
  notes?: string | null;
}

export interface Part { id: string; name: string; qty: number; kind: PartKind; provenance: Provenance }
export interface PartRef { id: string; qty: number }

export interface Action {
  verb: Verb;
  object: string;
  target?: string | null;
  qty?: number | null;
  tool?: string | null;
  direction?: Direction | null;
  detail: string;
}

export type BBox = [number, number, number, number];

export interface Figure { page: string; bbox: number[]; highlights?: number[][] }
export interface Narration { standard: string; simple: string }
export interface Note { text: string; provenance: Provenance }
export interface Choice { id: string; label: string }
export interface Options { prompt: string; choices: Choice[]; default?: string | null }

export interface Step {
  id: string;
  index: number;
  source_label?: string | null;
  title: string;
  template: Template;
  parts_used: PartRef[];
  tools: string[];
  actions: Action[];
  figure?: Figure | null;
  narration: Narration;
  warnings: Note[];
  tips: Note[];
  options?: Options | null;
  checkpoint?: string | null;
  estimated_seconds: number;
  review_notes: string[];
}

export interface Guide {
  schema_version: string;
  guide_id: string;
  title: string;
  content_model: ContentModel;
  product: Product;
  source: Source;
  parts: Part[];
  steps: Step[];
}

export function partById(guide: Guide, id: string): Part | undefined {
  return guide.parts.find((p) => p.id === id);
}

export function pageByKey(guide: Guide, key: string): SourcePage | undefined {
  return guide.source.pages.find((p) => p.page === key);
}
