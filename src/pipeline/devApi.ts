import type { IncomingMessage, ServerResponse } from "node:http";
import { callOpenAI } from "./openaiVision";
import { openaiApiKey } from "./env";
import type { SourcePage } from "../types/guide";

/** Vite middleware: YouTube fetch + optional OpenAI vision (keys stay on the server). */
export async function handlePipelineApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  if (!url.pathname.startsWith("/api/pipeline/")) return false;

  try {
    if (url.pathname === "/api/pipeline/youtube/oembed" && req.method === "GET") {
      const target = url.searchParams.get("url");
      if (!target) return send(res, 400, { error: "url required" });
      const data = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`)
        ?? await fetchJson(`https://noembed.com/embed?url=${encodeURIComponent(target)}`);
      return send(res, data ? 200 : 502, data ?? { error: "oembed failed" });
    }
    if (url.pathname === "/api/pipeline/youtube/captions" && req.method === "GET") {
      const v = url.searchParams.get("v");
      if (!v) return send(res, 400, { error: "v required" });
      const captions = await fetchCaptions(v);
      return send(res, 200, { captions });
    }
    if (url.pathname === "/api/pipeline/vision" && req.method === "POST") {
      const key = openaiApiKey();
      if (!key) return send(res, 501, { error: "OPENAI_API_KEY not set" });
      const body = JSON.parse(await readBody(req)) as { name?: string; pages?: SourcePage[] };
      const parsed = await callOpenAI(body.pages ?? [], body.name ?? "Untitled", key);
      if (!parsed) return send(res, 502, { error: "vision model returned nothing" });
      return send(res, 200, parsed);
    }
    return send(res, 404, { error: "not found" });
  } catch (err) {
    return send(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}

function send(res: ServerResponse, status: number, body: unknown): boolean {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(json);
  return true;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCaptions(videoId: string): Promise<Array<{ t: number; text: string }>> {
  const urls = [
    `https://www.youtube.com/api/timedtext?lang=en&v=${encodeURIComponent(videoId)}`,
    `https://www.youtube.com/api/timedtext?lang=en-US&v=${encodeURIComponent(videoId)}`,
    `https://www.youtube.com/api/timedtext?lang=en&fmt=srv3&v=${encodeURIComponent(videoId)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      const cues = parseTimedText(xml);
      if (cues.length) return cues;
    } catch {
      // try next
    }
  }
  return [];
}

function parseTimedText(xml: string): Array<{ t: number; text: string }> {
  const out: Array<{ t: number; text: string }> = [];
  const re = /<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = Number(m[1]);
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text) out.push({ t: Number.isFinite(t) ? t : 0, text });
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
