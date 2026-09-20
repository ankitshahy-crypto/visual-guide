import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { narrationHash, ensureLine, findEspeak, indexCoversGuide } from "./tts";
import { normalizeNarration } from "../lib/ttsHash";
import golden from "../data/golden/newtral-magich-pro.json";
import { assertGuide } from "../lib/validate";
import { bundledNarrationIndex, resolveLinesFromIndex } from "../lib/narrationAudio";

function tempDirs() {
  const root = mkdtempSync(join(tmpdir(), "vg-tts-"));
  const committedDir = join(root, "committed");
  const cacheDir = join(root, "cache");
  mkdirSync(committedDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  return {
    root,
    committedDir,
    cacheDir,
    indexPath: join(root, "index.json"),
    publicIndexPath: join(root, "public-index.json"),
  };
}

describe("tts cache", () => {
  it("hashes normalized text so unchanged lines share a file", () => {
    const a = narrationHash("Flip the seat.  ");
    const b = narrationHash("  Flip the seat.");
    const c = narrationHash("Flip the seat over.");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("does not re-synthesize when the hash file already exists", async () => {
    const dirs = tempDirs();
    const text = "Hello from the cache.";
    const hash = narrationHash(text);
    const dest = join(dirs.committedDir, `${hash}.mp3`);
    writeFileSync(dest, Buffer.from("dummy-audio"));
    const result = await ensureLine(text, { ...dirs, provider: "espeak" });
    expect(result.cached).toBe(true);
    expect(result.hash).toBe(hash);
    expect(readFileSync(dest).toString()).toBe("dummy-audio");
    rmSync(dirs.root, { recursive: true, force: true });
  });

  it("generates once then hits cache for the same line", async () => {
    if (!findEspeak()) return;
    const dirs = tempDirs();
    const text = "Put part F on the bottom.";
    const first = await ensureLine(text, { ...dirs, provider: "espeak" });
    expect(first.cached).toBe(false);
    expect(first.src).toBeTruthy();
    const second = await ensureLine(text, { ...dirs, provider: "espeak" });
    expect(second.cached).toBe(true);
    expect(second.hash).toBe(first.hash);
    rmSync(dirs.root, { recursive: true, force: true });
  });
});

describe("golden narration index", () => {
  it("covers every standard and simple sentence when fixtures are present", () => {
    const guide = assertGuide(golden);
    const missing = indexCoversGuide(guide, bundledNarrationIndex);
    if (Object.keys(bundledNarrationIndex.files).length === 0) {
      expect(missing.length).toBeGreaterThan(0);
      return;
    }
    expect(missing).toEqual([]);
    const standard = resolveLinesFromIndex(guide.steps[0].narration.standard);
    const simple = resolveLinesFromIndex(guide.steps[0].narration.simple);
    expect(standard?.length).toBeGreaterThan(0);
    expect(simple?.length).toBeGreaterThan(0);
    expect(standard?.map((l) => l.hash).join()).not.toBe(simple?.map((l) => l.hash).join());
  });
});

describe("normalizeNarration", () => {
  it("collapses whitespace", () => {
    expect(normalizeNarration("  a\n b  ")).toBe("a b");
  });
});
