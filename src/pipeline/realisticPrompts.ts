import type { Guide, Part, Step } from "../types/guide";
import type { ProductReferenceKind } from "./productReference";

/**
 * Text half of realistic-still generation. The image half is the step diagram
 * crop, the parts-list text below, and a finished-product photo when one was
 * resolved. Letter tags stay in the player; prompts must not paint them.
 */

export type ImageQuality = "low" | "medium" | "high";
export type ImageKind = "step" | "part";

export function realisticStyleBlock(): string {
  return [
    "Photorealistic studio product photograph, soft even lighting, seamless warm off-white background.",
    "If a finished-product photo is attached, match its materials, colors, and overall shape.",
    "If a manual diagram is attached, treat it as the spatial source of truth: which parts touch, which side is up, and what the action is. Translate that diagram into a photograph. Do not redraw it as a sketch.",
    "Do not invent extra parts.",
    "No text, letters, numbers, arrows, captions, logos, watermarks, or sketch lines.",
    "Not a pencil drawing, not a cartoon, not an icon.",
  ].join(" ");
}

export function partsListLine(guide: Guide): string {
  const line = guide.parts.map((p) => `${p.id} ${p.name} ×${p.qty}`).join("; ");
  return `Parts list from the manual: ${line}.`;
}

export function referenceLine(kind?: ProductReferenceKind): string {
  switch (kind) {
    case "manual-cover":
      return "The attached finished-product photo is the cover or hero image already in the manual. Match it. No user photo is required.";
    case "catalog-fetch":
      return "The attached finished-product photo was fetched from the model number read in the manual. Match its materials and shape. The diagram still decides how parts connect. No user photo is required.";
    case "user-upload":
      return "The attached finished-product photo is an optional fallback supplied for this run. Match it. The diagram still decides how parts connect.";
    default:
      return "No finished-product photo is attached. Use the diagram and the parts list. No user photo is required.";
  }
}

export function partLabel(guide: Guide, id: string): string {
  const part = guide.parts.find((p) => p.id === id);
  return part ? `${part.name}` : id;
}

export function buildStepPrompt(guide: Guide, step: Step, reference?: ProductReferenceKind): string {
  const product = `${guide.product.brand} ${guide.product.model} (${guide.product.category})`;
  const used = step.parts_used.map((ref) => `${partLabel(guide, ref.id)} ×${ref.qty}`).join("; ");
  const tools = step.tools.map((id) => partLabel(guide, id)).join(", ");
  const actions = step.actions.map((a) => `- ${a.detail}`).join("\n");
  const overview = step.template === "parts_overview"
    ? "This still is the parts check before assembly. Lay every catalog part on a table so they can be counted."
    : "";
  return [
    realisticStyleBlock(),
    referenceLine(reference),
    partsListLine(guide),
    `Product: ${product}.`,
    `Step: ${step.title}.`,
    overview,
    actions ? `Show this action:\n${actions}` : "",
    used ? `Parts in frame: ${used}.` : "",
    tools ? `Tool in frame: ${tools}.` : "",
    "Letter tags are drawn by the player. Do not paint letters onto the photo.",
    step.warnings[0] ? `Safety the photo may show: ${step.warnings[0].text}` : "",
  ].filter(Boolean).join("\n");
}

export function buildPartPrompt(guide: Guide, part: Part, reference?: ProductReferenceKind): string {
  const product = `${guide.product.brand} ${guide.product.model} (${guide.product.category})`;
  const count = part.qty > 1 && part.name.toLowerCase().includes("set")
    ? `Show the set (${part.qty} pieces) together.`
    : "Show a single piece, centered, filling most of the frame.";
  return [
    realisticStyleBlock(),
    referenceLine(reference),
    partsListLine(guide),
    `Product: ${product}.`,
    `Catalog photo of one part from that list: ${part.id} ${part.name}.`,
    `Kind: ${part.kind}.`,
    count,
    "Isolated on the seamless background. No ruler.",
    "Letter tags are drawn by the player. Do not paint letters onto the photo.",
  ].join("\n");
}

/** Rough gpt-image-1 list prices in USD, excluding input-image tokens. Confirm at openai.com/pricing. */
export function estimateImageUsd(kind: ImageKind, quality: ImageQuality): number {
  const table: Record<ImageQuality, Record<ImageKind, number>> = {
    low: { step: 0.016, part: 0.011 },
    medium: { step: 0.063, part: 0.042 },
    high: { step: 0.25, part: 0.167 },
  };
  return table[quality][kind];
}

export function stepImageSize(): string {
  return "1536x1024";
}

export function partImageSize(): string {
  return "1024x1024";
}
