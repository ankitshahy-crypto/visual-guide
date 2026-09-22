import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import type { Guide, SourcePage } from "../types/guide";

/**
 * Where the finished-product photo comes from. Lowest user effort first.
 * 1. Cover or hero image already in the manual.
 * 2. A lookup by model / SKU read from the manual.
 * 3. Optional `--product-photo` only after 1 and 2 fail. Never required.
 */

export type ProductReferenceKind = "manual-cover" | "catalog-fetch" | "user-upload" | "none";

export interface ProductReference {
  kind: ProductReferenceKind;
  path: string | null;
  page?: string;
  image?: string;
  identifiers: string[];
  detail: string;
}

export function isProductPageLabel(label: string | null | undefined): boolean {
  return /\b(cover|hero|product)\b/i.test(label ?? "");
}

/** Cover / hero page shipped inside the manual, if the guide labeled one. */
export function manualProductPage(guide: Guide): SourcePage | null {
  return guide.source.manual.pages.find((p) => isProductPageLabel(p.label)) ?? null;
}

/** Model and SKU tokens already parsed from the manual (plus optional OCR text). */
export function productIdentifiers(guide: Guide, extraText = ""): string[] {
  const raw = [
    guide.product.brand,
    guide.product.model,
    guide.title,
    guide.source.manual.file ?? "",
    guide.source.manual.notes ?? "",
    extraText,
  ].join("\n");
  const normalized = raw.replace(/_/g, "");
  const found = new Set<string>();
  const sku = /\b[A-Za-z][A-Za-z0-9]{1,14}(?:-[A-Za-z0-9]{2,14})+\b/g;
  for (const match of normalized.matchAll(sku)) found.add(match[0]);
  return [...found];
}

export function catalogQuery(guide: Guide, identifiers: string[]): string {
  const sku = identifiers[0] ?? guide.product.model;
  return [guide.product.brand, sku, guide.product.category].filter(Boolean).join(" ").trim();
}

export function selectProductReference(input: {
  manualPath: string | null;
  manualPage?: string;
  manualImage?: string;
  catalogPath: string | null;
  userPath: string | null;
  identifiers: string[];
  catalogPending?: boolean;
  query?: string;
}): ProductReference {
  const identifiers = input.identifiers;
  if (input.manualPath) {
    const ignored = input.userPath
      ? " An optional user photo was ignored because the manual already has a cover or hero image."
      : "";
    return {
      kind: "manual-cover",
      path: input.manualPath,
      page: input.manualPage,
      image: input.manualImage,
      identifiers,
      detail: `Finished-product photo is page ${input.manualPage ?? "?"} already in the manual (${input.manualImage ?? input.manualPath}). No user photo is required.${ignored}`,
    };
  }
  if (input.catalogPath) {
    return {
      kind: "catalog-fetch",
      path: input.catalogPath,
      identifiers,
      detail: `No cover or hero image in the manual. Using a product photo fetched for ${identifiers.join(", ") || input.query || "the model number"}. No user photo is required.`,
    };
  }
  if (input.catalogPending) {
    return {
      kind: "none",
      path: null,
      identifiers,
      detail: `No cover or hero image in the manual. Would search "${input.query ?? ""}" for ${identifiers.join(", ") || "a model number"}. No user photo is required. --product-photo is only a fallback if that search returns nothing.`,
    };
  }
  if (input.userPath) {
    return {
      kind: "user-upload",
      path: input.userPath,
      identifiers,
      detail: "No cover or hero image in the manual, and catalog search did not return a photo. Using the optional --product-photo fallback. A user photo is not required for generation.",
    };
  }
  return {
    kind: "none",
    path: null,
    identifiers,
    detail: "No cover or hero image in the manual, catalog search did not return a photo, and no --product-photo was passed. Generating from the diagram and parts list only. No user photo is required.",
  };
}

/** DuckDuckGo instant-answer `Image` field → absolute URL, or null. */
export function imageUrlFromInstantAnswer(data: { Image?: string | null }): string | null {
  const image = data.Image?.trim();
  if (!image) return null;
  if (image.startsWith("//")) return `https:${image}`;
  if (image.startsWith("/")) return `https://duckduckgo.com${image}`;
  if (/^https?:\/\//i.test(image)) return image;
  return null;
}

/** Best-effort product photo for a model string. Returns a local path, or null. Never throws. */
export async function fetchCatalogImage(query: string, dest: string): Promise<string | null> {
  if (!query.trim()) return null;
  try {
    const search = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "Plainstep/0.1 (realistic-stills)" } },
    );
    if (!search.ok) return null;
    const json = await search.json() as { Image?: string | null };
    const url = imageUrlFromInstantAnswer(json);
    if (!url) return null;
    const img = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "Plainstep/0.1 (realistic-stills)" } });
    if (!img.ok) return null;
    const type = img.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const bytes = Buffer.from(await img.arrayBuffer());
    if (bytes.byteLength < 1000 || bytes.byteLength > 5_000_000) return null;
    writeFileSync(dest, bytes);
    return dest;
  } catch {
    return null;
  }
}

/** OCR a page only to recover a model number. Empty when tesseract is not installed. */
export function ocrImageText(imagePath: string): string {
  const probe = spawnSync("tesseract", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) return "";
  const run = spawnSync("tesseract", [imagePath, "stdout", "--psm", "6"], {
    encoding: "utf8",
    timeout: 20_000,
  });
  if (run.error || run.status !== 0) return "";
  return run.stdout ?? "";
}
