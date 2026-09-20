import { fetchPipelineJson } from "../lib/pipelineApi";
import { shouldSkipLivePipelineApis } from "../lib/staticHost";
import type { CaptionCue, VideoObservation } from "./types";

const TEACH_RE = /\b(insert|tighten|fasten|attach|flip|place|click|snap|press|rotate|bolts?|screws?|hex|until|seats?|facing|upside|orientation|push|align|slide|start)\b/i;
const MUSIC_RE = /♪|\[music\]|\blyrics\b|\bchorus\b|\bverse\b|\bla la\b|\byeah yeah\b|\bfeat\.|\bofficial audio\b|\bofficial music video\b/i;

export function parseYouTubeId(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  try {
    const u = new URL(raw);
    if (u.hostname.replace(/^www\./, "") === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    const m = raw.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m?.[1] ?? null;
  }
  return null;
}

export function classifyAudio(captions: CaptionCue[], title?: string | null): VideoObservation["audioKind"] {
  if (/official audio|lyrics|music video/i.test(title ?? "")) {
    const teach = captions.filter((c) => TEACH_RE.test(c.text)).length;
    if (teach < 2) return "music";
  }
  if (!captions.length) return "unknown";
  const blob = captions.map((c) => c.text).join(" ");
  const teachHits = captions.filter((c) => TEACH_RE.test(c.text)).length;
  const musicHits = captions.filter((c) => MUSIC_RE.test(c.text)).length;
  if (teachHits === 0 && (musicHits > 0 || captions.length > 4)) return "music";
  if (MUSIC_RE.test(blob) && teachHits < 2) return "music";
  if (teachHits > 0) return "speech";
  return "unknown";
}

export function teachingCaptions(obs: VideoObservation): CaptionCue[] {
  if (obs.audioKind === "music" || obs.audioKind === "none") return [];
  return obs.captions.filter((c) => TEACH_RE.test(c.text) && !MUSIC_RE.test(c.text));
}

export async function fetchVideoObservation(locators: {
  youtubeUrl?: string;
  packagingUrl?: string;
}): Promise<VideoObservation> {
  const youtube = locators.youtubeUrl?.trim() || undefined;
  const packaging = locators.packagingUrl?.trim() || undefined;
  const videoId = parseYouTubeId(youtube) || parseYouTubeId(packaging);
  const log: string[] = [];
  const url = youtube || packaging || "";

  let title: string | null = null;
  let captions: CaptionCue[] = [];
  let frames: VideoObservation["frames"] = [];
  let status: VideoObservation["fetchStatus"] = "partial";

  if (videoId && shouldSkipLivePipelineApis()) {
    log.push("no pipeline API on this host — skipped live YouTube fetch");
  } else if (videoId) {
    const meta = await fetchPipelineJson(`/api/pipeline/youtube/oembed?url=${encodeURIComponent(url)}`)
      ?? await getJson(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (meta && typeof meta === "object" && "title" in meta) {
      title = String((meta as { title?: string }).title ?? "") || null;
      log.push(`oEmbed: ${title}`);
    }
    const capJson = await fetchPipelineJson(`/api/pipeline/youtube/captions?v=${encodeURIComponent(videoId)}`);
    if (capJson && typeof capJson === "object" && Array.isArray((capJson as { captions?: unknown }).captions)) {
      captions = (capJson as { captions: CaptionCue[] }).captions;
      log.push(`captions: ${captions.length} cues`);
    }
    frames = [0, 1, 2, 3].map((n) => ({
      t: n,
      note: n === 0 ? "poster frame" : `storyboard frame ${n}`,
      imageUrl: `https://i.ytimg.com/vi/${videoId}/${n}.jpg`,
    }));
    if (title || captions.length) status = captions.length ? "fetched" : "partial";
    else log.push("YouTube fetch returned no title or captions — will use visuals + manual text");
  } else {
    log.push("locator is not a YouTube URL — stored, no frames fetched");
  }

  const audioKind = classifyAudio(captions, title);
  if (audioKind === "music") log.push("audio looks music-only — ignoring lyrics; teaching actions come from visuals + the manual");

  return {
    youtubeUrl: youtube,
    packagingUrl: packaging,
    videoId,
    title,
    captions,
    audioKind,
    frames,
    fetchStatus: status,
    log,
  };
}

async function getJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (ct && !/json/i.test(ct)) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
