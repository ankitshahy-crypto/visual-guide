import { SAMPLE_YOUTUBE_URL } from "../pipeline/fixtures/sampleVideo";
import type { PendingCreate } from "./pendingCreate";
import type { StoredFile } from "./projectsStore";
import { publicUrl } from "./publicUrl";

export const RECORDED_FIXTURE_YOUTUBE_URL = SAMPLE_YOUTUBE_URL;
export const RECORDED_FIXTURE_NAME = "MagicH fixture";

export const RECORDED_FIXTURE_PAGES = [
  { name: "parts-list.jpg", publicPath: "fixtures/parts-list.jpg" },
  { name: "assembly-steps.jpg", publicPath: "fixtures/assembly-steps.jpg" },
] as const;

export function recordedFixturePending(files: StoredFile[], name?: string): PendingCreate {
  return {
    name: name?.trim() || RECORDED_FIXTURE_NAME,
    files,
    youtubeUrl: RECORDED_FIXTURE_YOUTUBE_URL,
    fixture: true,
  };
}

export async function loadRecordedFixtureFiles(
  load: (publicPath: string) => Promise<string> = fetchPublicDataUrl,
): Promise<StoredFile[]> {
  const files: StoredFile[] = [];
  for (const page of RECORDED_FIXTURE_PAGES) {
    files.push({
      name: page.name,
      mime: "image/jpeg",
      role: "photo",
      dataUrl: await load(page.publicPath),
    });
  }
  if (files.length < RECORDED_FIXTURE_PAGES.length) {
    throw new Error("Could not load recorded fixture pages.");
  }
  return files;
}

async function fetchPublicDataUrl(publicPath: string): Promise<string> {
  const res = await fetch(publicUrl(publicPath));
  if (!res.ok) throw new Error(`Missing fixture ${publicPath}`);
  const blob = await res.blob();
  if (typeof FileReader === "undefined") {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (const b of buf) bin += String.fromCharCode(b);
    return `data:image/jpeg;base64,${btoa(bin)}`;
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
