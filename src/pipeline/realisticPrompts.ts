import type { Guide, Part, Step } from "../types/guide";

/**
 * Text half of realistic-still generation. The image half is the manual figure
 * crop plus the cover photo, attached by `cliRealistic`. Letter tags stay in
 * the player; prompts must not ask the model to paint them.
 */

export type ImageQuality = "low" | "medium" | "high";
export type ImageKind = "step" | "part";

export function realisticStyleBlock(): string {
  return [
    "Photorealistic studio product photograph, soft even lighting, seamless warm off-white background.",
    "If a cover photo is attached, match its materials, colors, and overall product shape.",
    "If a manual diagram is attached, treat it as the spatial source of truth: which parts touch, which side is up, and what the action is. Translate that diagram into a photograph. Do not redraw it as a sketch.",
    "Do not invent extra parts.",
    "No text, letters, numbers, arrows, captions, logos, watermarks, or sketch lines.",
    "Not a pencil drawing, not a cartoon, not an icon.",
  ].join(" ");
}

export function partLabel(guide: Guide, id: string): string {
  const part = guide.parts.find((p) => p.id === id);
  return part ? `${part.name}` : id;
}

export function buildStepPrompt(guide: Guide, step: Step): string {
  const product = `${guide.product.brand} ${guide.product.model} (${guide.product.category})`;
  const used = step.parts_used.map((ref) => `${partLabel(guide, ref.id)} ×${ref.qty}`).join("; ");
  const tools = step.tools.map((id) => partLabel(guide, id)).join(", ");
  const actions = step.actions.map((a) => `- ${a.detail}`).join("\n");
  const overview = step.template === "parts_overview"
    ? [
      "This still is the parts check before assembly.",
      "Lay every catalog part on a table so they can be counted.",
      guide.parts.map((p) => `- ${p.name} ×${p.qty}`).join("\n"),
    ].join("\n")
    : "";
  return [
    realisticStyleBlock(),
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

export function buildPartPrompt(guide: Guide, part: Part): string {
  const product = `${guide.product.brand} ${guide.product.model} (${guide.product.category})`;
  const count = part.qty > 1 && part.name.toLowerCase().includes("set")
    ? `Show the set (${part.qty} pieces) together.`
    : "Show a single piece, centered, filling most of the frame.";
  return [
    realisticStyleBlock(),
    `Product: ${product}.`,
    `Catalog photo of one part: ${part.name}.`,
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
