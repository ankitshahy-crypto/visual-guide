import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import type { Guide } from "../types/guide";
import type { NarrationFile, NarrationIndex } from "../lib/narrationAudio";
import { estimateDurationMs, normalizeNarration } from "../lib/ttsHash";
import { splitSentences } from "../lib/sentences";
import { openaiApiKey, openaiTtsModel, openaiTtsVoice, ttsProviderPref } from "./env";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export type TtsProvider = "openai" | "espeak" | "none";

export interface TtsLineResult {
  text: string;
  hash: string;
  src: string | null;
  file: string | null;
  durationMs: number | null;
  cached: boolean;
  provider: TtsProvider;
}

export interface EnsureLinesResult {
  provider: TtsProvider;
  fallback: "speechSynthesis" | "none";
  lines: TtsLineResult[];
}

export interface SynthesizeOptions {
  cacheDir?: string;
  committedDir?: string;
  /** Where new files are written. Golden fixtures use committedDir; the dev API uses cacheDir. */
  writeDir?: string;
  indexPath?: string;
  publicIndexPath?: string;
  provider?: TtsProvider;
  openaiKey?: string;
}

function defaultCommittedDir(): string {
  return join(root, "public", "narration");
}

function defaultCacheDir(): string {
  return join(root, "public", "narration", "cache");
}

function defaultIndexPath(): string {
  return join(root, "src", "data", "narration-index.json");
}

function defaultPublicIndexPath(): string {
  return join(root, "public", "narration", "index.json");
}

export function narrationHash(text: string): string {
  return createHash("sha256").update(normalizeNarration(text), "utf8").digest("hex").slice(0, 16);
}

export function findEspeak(): string | null {
  for (const cmd of ["espeak-ng", "espeak"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.error) continue;
    if (r.status === 0 || (r.stdout + r.stderr).toLowerCase().includes("speak")) return cmd;
  }
  return null;
}

export function detectTtsProvider(opts?: SynthesizeOptions): TtsProvider {
  if (opts?.provider) return opts.provider;
  const pref = ttsProviderPref();
  if (pref === "off") return "none";
  const key = opts?.openaiKey ?? openaiApiKey();
  if (pref === "openai") return key ? "openai" : "none";
  if (pref === "espeak") return findEspeak() ? "espeak" : "none";
  if (key) return "openai";
  if (findEspeak()) return "espeak";
  return "none";
}

export function ttsStatus(opts?: SynthesizeOptions): { provider: TtsProvider; fallback: "speechSynthesis" | "none"; espeak: boolean; openai: boolean } {
  const provider = detectTtsProvider(opts);
  return {
    provider,
    fallback: "speechSynthesis",
    espeak: Boolean(findEspeak()),
    openai: Boolean(opts?.openaiKey ?? openaiApiKey()),
  };
}

function publicSrcFor(absFile: string): { file: string; src: string } {
  const norm = absFile.replace(/\\/g, "/");
  const marker = "/public/";
  const i = norm.lastIndexOf(marker);
  const rel = i >= 0 ? norm.slice(i + marker.length) : norm.split("/").pop() ?? norm;
  return { file: rel, src: `/${rel}` };
}

function probeDurationMs(file: string): number | null {
  const r = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1",
    file,
  ], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const sec = Number(r.stdout.trim());
  return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : null;
}

function encodeMp3(wav: string, mp3: string): boolean {
  const r = spawnSync("ffmpeg", [
    "-y", "-i", wav,
    "-ar", "16000", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", "48k",
    mp3,
  ], { encoding: "utf8" });
  return r.status === 0 && existsSync(mp3);
}

async function openaiSpeech(text: string, dest: string, key: string): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiTtsModel(),
      voice: openaiTtsVoice(),
      input: normalizeNarration(text),
      response_format: "mp3",
    }),
  });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64) return false;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return true;
}

function espeakSpeech(text: string, destWav: string): boolean {
  const bin = findEspeak();
  if (!bin) return false;
  mkdirSync(dirname(destWav), { recursive: true });
  const r = spawnSync(bin, [
    "-v", "en-us",
    "-s", "150",
    "-w", destWav,
    "--",
    normalizeNarration(text),
  ], { encoding: "utf8" });
  return r.status === 0 && existsSync(destWav);
}

function resolveExisting(hash: string, committedDir: string, cacheDir: string): string | null {
  for (const ext of ["mp3", "wav"]) {
    const committed = join(committedDir, `${hash}.${ext}`);
    if (existsSync(committed)) return committed;
    const cached = join(cacheDir, `${hash}.${ext}`);
    if (existsSync(cached)) return cached;
  }
  return null;
}

export async function ensureLine(text: string, opts?: SynthesizeOptions): Promise<TtsLineResult> {
  const trimmed = normalizeNarration(text);
  const hash = narrationHash(trimmed);
  const committedDir = opts?.committedDir ?? defaultCommittedDir();
  const cacheDir = opts?.cacheDir ?? defaultCacheDir();
  const writeDir = opts?.writeDir ?? cacheDir;
  mkdirSync(committedDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(writeDir, { recursive: true });

  const existing = resolveExisting(hash, committedDir, cacheDir);
  if (existing) {
    const { file, src } = publicSrcFor(existing);
    return {
      text: trimmed,
      hash,
      src,
      file,
      durationMs: probeDurationMs(existing) ?? estimateDurationMs(trimmed),
      cached: true,
      provider: detectTtsProvider(opts),
    };
  }

  const provider = detectTtsProvider(opts);
  if (provider === "none") {
    return { text: trimmed, hash, src: null, file: null, durationMs: null, cached: false, provider };
  }

  const destMp3 = join(writeDir, `${hash}.mp3`);
  let wrote = false;
  if (provider === "openai") {
    const key = opts?.openaiKey ?? openaiApiKey();
    if (key) wrote = await openaiSpeech(trimmed, destMp3, key);
  }
  if (!wrote && (provider === "espeak" || provider === "openai")) {
    const wav = join(writeDir, `${hash}.wav`);
    if (espeakSpeech(trimmed, wav)) {
      wrote = encodeMp3(wav, destMp3);
      if (wrote && existsSync(wav)) {
        try { unlinkSync(wav); } catch { /* keep wav if delete fails */ }
      }
      if (!wrote && existsSync(wav)) {
        const { file, src } = publicSrcFor(wav);
        return {
          text: trimmed,
          hash,
          src,
          file,
          durationMs: probeDurationMs(wav) ?? estimateDurationMs(trimmed),
          cached: false,
          provider: "espeak",
        };
      }
    }
  }

  if (wrote && existsSync(destMp3)) {
    const { file, src } = publicSrcFor(destMp3);
    return {
      text: trimmed,
      hash,
      src,
      file,
      durationMs: probeDurationMs(destMp3) ?? estimateDurationMs(trimmed),
      cached: false,
      provider,
    };
  }

  return { text: trimmed, hash, src: null, file: null, durationMs: null, cached: false, provider };
}

export async function ensureLines(texts: string[], opts?: SynthesizeOptions): Promise<EnsureLinesResult> {
  const provider = detectTtsProvider(opts);
  const seen = new Map<string, TtsLineResult>();
  const lines: TtsLineResult[] = [];
  for (const raw of texts) {
    const key = narrationHash(raw);
    const hit = seen.get(key);
    if (hit) {
      lines.push(hit);
      continue;
    }
    const result = await ensureLine(raw, { ...opts, provider });
    seen.set(key, result);
    lines.push(result);
  }
  return {
    provider,
    fallback: "speechSynthesis",
    lines,
  };
}

export function readNarrationIndex(path?: string): NarrationIndex {
  const p = path ?? defaultIndexPath();
  if (!existsSync(p)) return { version: 1, provider: "none", files: {} };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as NarrationIndex;
  } catch {
    return { version: 1, provider: "none", files: {} };
  }
}

export function writeNarrationIndex(index: NarrationIndex, opts?: SynthesizeOptions): void {
  const payload = `${JSON.stringify(index, null, 2)}\n`;
  const srcPath = opts?.indexPath ?? defaultIndexPath();
  const pubPath = opts?.publicIndexPath ?? defaultPublicIndexPath();
  mkdirSync(dirname(srcPath), { recursive: true });
  mkdirSync(dirname(pubPath), { recursive: true });
  writeFileSync(srcPath, payload);
  writeFileSync(pubPath, payload);
}

function upsertIndex(index: NarrationIndex, line: TtsLineResult): void {
  if (!line.file || !line.hash) return;
  index.files[line.hash] = {
    hash: line.hash,
    file: line.file,
    durationMs: line.durationMs ?? estimateDurationMs(line.text),
    text: line.text,
  };
}

/** Generate (or reuse) hashed speech files for every sentence of every step/level. */
export async function writeGoldenNarration(guide: Guide, opts?: SynthesizeOptions): Promise<NarrationIndex> {
  const provider = detectTtsProvider(opts);
  const committedDir = opts?.committedDir ?? defaultCommittedDir();
  const cacheDir = opts?.cacheDir ?? defaultCacheDir();
  mkdirSync(committedDir, { recursive: true });

  const index: NarrationIndex = {
    version: 1,
    provider,
    generatedAt: new Date().toISOString(),
    files: { ...readNarrationIndex(opts?.indexPath).files },
  };

  const unique = new Map<string, string>();
  for (const step of guide.steps) {
    for (const level of ["standard", "simple"] as const) {
      for (const sentence of splitSentences(step.narration[level])) {
        unique.set(narrationHash(sentence), sentence);
      }
    }
  }

  for (const sentence of unique.values()) {
    const line = await ensureLine(sentence, {
      ...opts,
      provider,
      cacheDir,
      committedDir,
      writeDir: committedDir,
    });
    if (line.src && line.file && line.hash) {
      const inCache = join(cacheDir, `${line.hash}.mp3`);
      const inCacheWav = join(cacheDir, `${line.hash}.wav`);
      const committedMp3 = join(committedDir, `${line.hash}.mp3`);
      const committedWav = join(committedDir, `${line.hash}.wav`);
      const srcFile = existsSync(inCache) && !existsSync(committedMp3) ? inCache
        : existsSync(inCacheWav) && !existsSync(committedWav) && !existsSync(committedMp3) ? inCacheWav
        : null;
      if (srcFile) {
        const dest = srcFile.endsWith(".wav") ? committedWav : committedMp3;
        writeFileSync(dest, readFileSync(srcFile));
        const mapped = publicSrcFor(dest);
        line.file = mapped.file;
        line.src = mapped.src;
      } else if (existsSync(committedMp3) || existsSync(committedWav)) {
        const dest = existsSync(committedMp3) ? committedMp3 : committedWav;
        const mapped = publicSrcFor(dest);
        line.file = mapped.file;
        line.src = mapped.src;
      }
      upsertIndex(index, line);
    }
  }

  writeNarrationIndex(index, opts);
  return index;
}

export function indexCoversGuide(guide: Guide, index: NarrationIndex): string[] {
  const missing: string[] = [];
  const byText = new Set(Object.values(index.files).map((f) => normalizeNarration(f.text)));
  for (const step of guide.steps) {
    for (const level of ["standard", "simple"] as const) {
      for (const sentence of splitSentences(step.narration[level])) {
        if (!byText.has(normalizeNarration(sentence))) {
          missing.push(`${step.id}:${level}:${sentence}`);
        }
      }
    }
  }
  return missing;
}

export type { NarrationFile };
