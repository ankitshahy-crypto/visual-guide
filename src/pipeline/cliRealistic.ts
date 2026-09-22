import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as jpegJs from "jpeg-js";
import type { Guide, Step } from "../types/guide";
import { assertGuide } from "../lib/validate";
import type { RealisticIndex } from "../lib/realistic";
import {
  catalogQuery,
  fetchCatalogImage,
  manualProductPage,
  ocrImageText,
  productIdentifiers,
  selectProductReference,
  type ProductReference,
} from "./productReference";
import {
  buildPartPrompt,
  buildStepPrompt,
  estimateImageUsd,
  partImageSize,
  stepImageSize,
  type ImageQuality,
} from "./realisticPrompts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const GOLDEN_ID = "newtral-magich-pro-assembly";

type JpegDecode = (
  bytes: Uint8Array,
  opts: { useTArray: boolean; formatAsRGBA?: boolean },
) => { width: number; height: number; data: Uint8Array };

function jpegApi(): { decode: JpegDecode; encode: typeof jpegJs.encode } {
  const mod = jpegJs as {
    decode?: JpegDecode;
    encode?: typeof jpegJs.encode;
    default?: { decode?: JpegDecode; encode?: typeof jpegJs.encode };
  };
  const decode = mod.decode ?? mod.default?.decode;
  const encode = mod.encode ?? mod.default?.encode;
  if (!decode || !encode) throw new Error("jpeg-js decode/encode unavailable");
  return { decode, encode };
}

function loadDotEnv(): void {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function flag(argv: string[], name: string): string | boolean | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const next = argv[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

function qualityFromEnv(): ImageQuality {
  const v = (process.env.OPENAI_IMAGE_QUALITY || "medium").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

export function resolveManualImage(image: string): string {
  if (/^(https?:|data:|blob:)/.test(image)) {
    throw new Error(`realistic generation needs a local file, got ${image}`);
  }
  const rel = image.replace(/^\//, "");
  const candidates = [
    join(root, rel),
    join(root, "public", rel),
    join(root, "public", "golden", rel),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`page image not found for "${image}". Tried: ${candidates.join(", ")}`);
}

export function cropJpeg(srcPath: string, bbox: number[], dest: string): void {
  const { decode, encode } = jpegApi();
  const decoded = decode(new Uint8Array(readFileSync(srcPath)), { useTArray: true, formatAsRGBA: true });
  const [x0, y0, x1, y1] = bbox;
  const left = clamp(Math.floor(x0 * decoded.width), 0, decoded.width - 1);
  const top = clamp(Math.floor(y0 * decoded.height), 0, decoded.height - 1);
  const right = clamp(Math.ceil(x1 * decoded.width), left + 1, decoded.width);
  const bottom = clamp(Math.ceil(y1 * decoded.height), top + 1, decoded.height);
  const w = right - left;
  const h = bottom - top;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = ((top + y) * decoded.width + left) * 4;
    data.set(decoded.data.subarray(srcStart, srcStart + w * 4), y * w * 4);
  }
  const encoded = encode({ data, width: w, height: h }, 85);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(encoded.data));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function tryManualImage(image: string): string | null {
  try {
    return resolveManualImage(image);
  } catch {
    return null;
  }
}

/** Cover/hero in the PDF, else a model-number lookup, else an optional local photo. */
export async function chooseProductReference(
  guide: Guide,
  userPhoto: string | null,
  dryRun: boolean,
  scratch: string,
): Promise<ProductReference> {
  const page = manualProductPage(guide);
  const manualPath = page ? tryManualImage(page.image) : null;
  let extra = "";
  if (!manualPath) {
    for (const candidate of guide.source.manual.pages.slice(0, 2)) {
      const image = tryManualImage(candidate.image);
      if (image) extra += `\n${ocrImageText(image)}`;
    }
  }
  const identifiers = productIdentifiers(guide, extra);
  const query = catalogQuery(guide, identifiers);
  if (manualPath) {
    return selectProductReference({
      manualPath,
      manualPage: page?.page,
      manualImage: page?.image,
      catalogPath: null,
      userPath: userPhoto,
      identifiers,
      query,
    });
  }
  if (dryRun) {
    const pending = selectProductReference({
      manualPath: null,
      catalogPath: null,
      userPath: null,
      identifiers,
      catalogPending: true,
      query,
    });
    if (userPhoto) {
      pending.detail += " A --product-photo file is present and will be used only if that search returns nothing.";
    }
    return pending;
  }
  mkdirSync(scratch, { recursive: true });
  const catalogPath = identifiers.length
    ? await fetchCatalogImage(query, join(scratch, "catalog-product.jpg"))
    : null;
  const userPath = userPhoto && existsSync(userPhoto) ? userPhoto : null;
  return selectProductReference({
    manualPath: null,
    catalogPath,
    userPath,
    identifiers,
    query,
  });
}

function outputLayout(guide: Guide): { relRoot: string; indexPath: string } {
  if (guide.guide_id === GOLDEN_ID) {
    return {
      relRoot: "golden/realistic",
      indexPath: join(root, "src/data/realistic-index.json"),
    };
  }
  const relRoot = `realistic/${guide.guide_id}`;
  return { relRoot, indexPath: join(root, "public", relRoot, "index.json") };
}

function readIndex(path: string, guide: Guide, provider: string): RealisticIndex {
  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as RealisticIndex;
    if (parsed.guide_id === guide.guide_id) return parsed;
  }
  return {
    version: 1,
    guide_id: guide.guide_id,
    provider,
    steps: {},
    parts: {},
  };
}

async function openaiImage(opts: {
  key: string;
  model: string;
  prompt: string;
  size: string;
  quality: ImageQuality;
  fidelity: string;
  references: string[];
}): Promise<Buffer> {
  const edited = await postEdit(opts);
  if (edited.ok) return edited.bytes;
  console.warn(`images/edits failed (${edited.status}): ${edited.detail}`);
  console.warn("Falling back to text-only images/generations. The result will not see the manual crop or cover.");
  const generated = await postGenerate(opts);
  if (!generated.ok) {
    throw new Error(`images/generations failed (${generated.status}): ${generated.detail}`);
  }
  return generated.bytes;
}

async function postEdit(opts: {
  key: string;
  model: string;
  prompt: string;
  size: string;
  quality: ImageQuality;
  fidelity: string;
  references: string[];
}): Promise<{ ok: true; bytes: Buffer } | { ok: false; status: number; detail: string }> {
  let last: { ok: false; status: number; detail: string } = { ok: false, status: 0, detail: "no attempt" };
  for (const field of ["image[]", "image"] as const) {
    const form = new FormData();
    form.set("model", opts.model);
    form.set("prompt", opts.prompt);
    form.set("size", opts.size);
    form.set("quality", opts.quality);
    form.set("output_format", "jpeg");
    form.set("input_fidelity", opts.fidelity);
    for (const file of opts.references) {
      const bytes = new Uint8Array(readFileSync(file));
      form.append(field, new Blob([bytes], { type: "image/jpeg" }), basename(file));
    }
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.key}` },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    if (res.ok) return { ok: true, bytes: await imageBytes(res) };
    last = { ok: false, status: res.status, detail: (await res.text()).slice(0, 500) };
    if (res.status !== 400) break;
  }
  return last;
}

async function postGenerate(opts: {
  key: string;
  model: string;
  prompt: string;
  size: string;
  quality: ImageQuality;
}): Promise<{ ok: true; bytes: Buffer } | { ok: false; status: number; detail: string }> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      size: opts.size,
      quality: opts.quality,
      output_format: "jpeg",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) return { ok: false, status: res.status, detail: (await res.text()).slice(0, 500) };
  return { ok: true, bytes: await imageBytes(res) };
}

async function imageBytes(res: Response): Promise<Buffer> {
  const json = await res.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = json.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!img.ok) throw new Error(`image URL download failed (${img.status})`);
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("image response had neither b64_json nor url");
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  loadDotEnv();
  const guidePath = typeof flag(argv, "--guide") === "string"
    ? String(flag(argv, "--guide"))
    : join(root, "src/data/golden/newtral-magich-pro.json");
  const guide = assertGuide(JSON.parse(readFileSync(guidePath, "utf8")));
  const dryRun = flag(argv, "--dry-run") === true;
  const force = flag(argv, "--force") === true;
  const userPhotoFlag = flag(argv, "--product-photo");
  const requestedPhoto = typeof userPhotoFlag === "string" ? userPhotoFlag : null;
  if (requestedPhoto && !existsSync(requestedPhoto)) {
    console.warn(`--product-photo not found: ${requestedPhoto}. It is optional and will not be used.`);
  }
  const userPhoto = requestedPhoto && existsSync(requestedPhoto) ? requestedPhoto : null;
  const stepFilter = splitList(flag(argv, "--steps"));
  const partFilter = splitList(flag(argv, "--parts"));
  const steps = guide.steps.filter((s) => !stepFilter || stepFilter.has(s.id));
  const parts = guide.parts.filter((p) => !partFilter || partFilter.has(p.id));
  const quality = qualityFromEnv();
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const fidelity = process.env.OPENAI_IMAGE_FIDELITY || "high";
  const key = process.env.OPENAI_API_KEY?.trim();
  const { relRoot, indexPath } = outputLayout(guide);
  const outDir = join(root, "public", relRoot);
  const cost = steps.length * estimateImageUsd("step", quality) + parts.length * estimateImageUsd("part", quality);

  console.log(`Guide: ${guide.guide_id}`);
  console.log(`Model: ${model}  quality: ${quality}  fidelity: ${fidelity}`);
  console.log(`Would generate ${steps.length} step still(s) and ${parts.length} part chip(s).`);
  console.log(`Rough list-price estimate: $${cost.toFixed(2)} before input-image tokens. Check https://openai.com/api/pricing`);
  console.log("The app does not call this API at runtime. Committed files are what the player shows.");

  const scratch = join(tmpdir(), "plainstep-realistic");
  const product = await chooseProductReference(guide, userPhoto, dryRun, scratch);
  console.log(`Product reference: ${product.kind}`);
  console.log(product.detail);
  console.log(`Identifiers from the manual: ${product.identifiers.join(", ") || "(none)"}`);
  console.log("Generation inputs: step diagram + parts list text + finished-product photo when the priority above found one.");

  if (dryRun) {
    for (const step of steps) console.log(`\n--- step ${step.id} ---\n${buildStepPrompt(guide, step, product.kind)}`);
    for (const part of parts) console.log(`\n--- part ${part.id} ---\n${buildPartPrompt(guide, part, product.kind)}`);
    return;
  }
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env or run with --dry-run. See docs/REALISTIC-VISUALS.md.");
  }

  mkdirSync(join(outDir, "steps"), { recursive: true });
  mkdirSync(join(outDir, "parts"), { recursive: true });
  const index = readIndex(indexPath, guide, `openai:${model}`);
  index.provider = `openai:${model}`;
  index.generatedAt = new Date().toISOString();
  index.product_reference = {
    source: product.kind,
    page: product.page,
    image: product.image,
    detail: product.detail,
  };

  for (const step of steps) {
    const rel = `${relRoot}/steps/${step.id}.jpg`;
    const dest = join(root, "public", rel);
    if (!force && existsSync(dest)) {
      console.log(`skip ${rel}`);
      index.steps[step.id] = rel;
      continue;
    }
    const refs = referencesForStep(guide, step, product.path, scratch);
    console.log(`generate ${rel}`);
    const bytes = await openaiImage({
      key,
      model,
      prompt: buildStepPrompt(guide, step, product.kind),
      size: stepImageSize(),
      quality,
      fidelity,
      references: refs,
    });
    writeFileSync(dest, bytes);
    index.steps[step.id] = rel;
  }

  const partsPage = partsOverviewPage(guide);
  for (const part of parts) {
    const rel = `${relRoot}/parts/${part.id}.jpg`;
    const dest = join(root, "public", rel);
    if (!force && existsSync(dest)) {
      console.log(`skip ${rel}`);
      index.parts[part.id] = rel;
      continue;
    }
    const refs = [product.path, partsPage].filter((p): p is string => Boolean(p));
    console.log(`generate ${rel}`);
    const bytes = await openaiImage({
      key,
      model,
      prompt: buildPartPrompt(guide, part, product.kind),
      size: partImageSize(),
      quality,
      fidelity,
      references: refs,
    });
    writeFileSync(dest, bytes);
    index.parts[part.id] = rel;
  }

  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${indexPath}`);
  if (guide.guide_id !== GOLDEN_ID) {
    console.log("This guide is not the bundled golden sample. The iOS/web player only auto-loads src/data/realistic-index.json.");
    console.log("To show these stills, point that index at this guide_id (or merge the entries) and rebuild.");
  }
}

function splitList(value: string | boolean | undefined): Set<string> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
}

function partsOverviewPage(guide: Guide): string | null {
  const overview = guide.steps.find((s) => s.template === "parts_overview" && s.figure);
  if (!overview?.figure) return null;
  const page = guide.source.manual.pages.find((p) => p.page === overview.figure?.page);
  return page ? resolveManualImage(page.image) : null;
}

function referencesForStep(guide: Guide, step: Step, productPhoto: string | null, scratch: string): string[] {
  const refs: string[] = [];
  if (productPhoto) refs.push(productPhoto);
  if (step.figure) {
    const page = guide.source.manual.pages.find((p) => p.page === step.figure?.page);
    if (page) {
      const src = resolveManualImage(page.image);
      const dest = join(scratch, `${guide.guide_id}-${step.id}.jpg`);
      cropJpeg(src, step.figure.bbox, dest);
      refs.push(dest);
    }
  }
  return refs;
}
