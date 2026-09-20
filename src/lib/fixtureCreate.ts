import { SAMPLE_YOUTUBE_URL } from "../pipeline/fixtures/sampleVideo";
import type { StoredFile } from "./projectsStore";

/** Recorded creator walkthrough — no OPENAI_API_KEY, no live YouTube. */
export const FIXTURE_CREATE_YOUTUBE_URL = SAMPLE_YOUTUBE_URL;
export const FIXTURE_CREATE_NAME = "MagicH fixture";

export const FIXTURE_CREATE_PAGES = [
  { name: "parts-list.jpg", rel: "fixtures/parts-list.jpg" },
  { name: "assembly-steps.jpg", rel: "fixtures/assembly-steps.jpg" },
] as const;

/** `#/new?fixture=1` preloads the chair sample pages on a phone (no file picker). */
export function wantsFixtureCreate(hash = typeof location !== "undefined" ? location.hash : ""): boolean {
  const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  return new URLSearchParams(q).has("fixture");
}

export function publicAssetUrl(rel: string, base = import.meta.env.BASE_URL || "./"): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${rel.replace(/^\//, "")}`;
}

export async function loadFixtureCreatePhotos(fetchImpl: typeof fetch = fetch): Promise<StoredFile[]> {
  const files: StoredFile[] = [];
  for (const page of FIXTURE_CREATE_PAGES) {
    const res = await fetchImpl(publicAssetUrl(page.rel));
    if (!res.ok) throw new Error(`Could not load ${page.name} (${res.status})`);
    const buf = new Uint8Array(await res.arrayBuffer());
    files.push({
      name: page.name,
      mime: "image/jpeg",
      role: "photo",
      dataUrl: `data:image/jpeg;base64,${bytesToBase64(buf)}`,
    });
  }
  return files;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
