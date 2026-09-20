import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseManual } from "./parseManual";
import { analyzeVideo } from "./analyzeVideo";
import { extractParts } from "./manualText";
import { decodeImage } from "./imageDecode";
import { readLayoutCues } from "./layoutVision";
import { SAMPLE_YOUTUBE_URL, sampleMusicObservation } from "./fixtures/sampleVideo";
import { mergeSources } from "./mergeSources";
import { assertGuide } from "../lib/validate";
import { listConflicts, listFills } from "../lib/review";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function photo(name: string, rel: string) {
  const buf = readFileSync(join(root, rel));
  return {
    name,
    mime: "image/jpeg",
    role: "photo" as const,
    dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`,
  };
}

describe("layout vision on parts-list.jpg", () => {
  it("finds the orange letter-tag grid on the recorded parts list", async () => {
    const file = photo("parts-list.jpg", "public/fixtures/parts-list.jpg");
    const img = await decodeImage(file.dataUrl);
    expect(img).toBeTruthy();
    const cues = readLayoutCues(img!);
    expect(cues.looksLikePartsGrid).toBe(true);
    expect(cues.orangeBadges.length).toBeGreaterThanOrEqual(14);
    expect(cues.orangeBadges.length).toBeLessThanOrEqual(18);
  });
});

describe("parseManual", () => {
  it("extracts lettered parts from the recorded parts-list photo", async () => {
    const result = await parseManual("MagicH sample", [
      photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
    ]);
    expect(result.stubbed).toEqual([]);
    const ids = result.parts.map((p) => p.id);
    expect(ids).toContain("A");
    expect(ids).toContain("H");
    expect(ids).toContain("Q");
    expect(result.parts.find((p) => p.id === "H")?.qty).toBe(4);
    expect(result.parts.find((p) => p.id === "I")?.qty).toBe(6);
    expect(result.steps.some((s) => s.template === "parts_overview")).toBe(true);
  });

  it("maps assembly-sheet pages onto recorded MagicH steps", async () => {
    const result = await parseManual("MagicH sample", [
      photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
      photo("p-04.jpg", "public/golden/pages/p-04.jpg"),
    ]);
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
    expect(result.steps.some((s) => /mechanism/i.test(s.title))).toBe(true);
    expect(result.steps.filter((s) => s.template === "figure_action").every((s) => s.figure)).toBe(true);
    expect(result.steps.filter((s) => s.template === "figure_action").every((s) => s.actions.length > 0)).toBe(true);
  });

  it("rasterizes a PDF via the injected splitter and reads its text layer", async () => {
    const result = await parseManual("Box", [
      { name: "box.pdf", mime: "application/pdf", role: "pdf", dataUrl: "data:application/pdf;base64,AAA" },
    ], {
      rasterizePdf: async () => [{
        page: "1",
        label: "1",
        image: "data:image/jpeg,stub",
        width: 200,
        height: 300,
        text: "Parts List\nA 1PC Headrest\nH M6*50mm 4PCS bolt\nStep 1 Mechanism Assembling\nFlip the seat. Fasten with H.",
      }],
    });
    expect(result.parts.some((p) => p.id === "A")).toBe(true);
    expect(result.parts.find((p) => p.id === "H")?.kind).toBe("fastener");
    expect(result.source.type).toBe("pdf");
  });
});

describe("manual text extract", () => {
  it("reads letter/qty/size tags from OCR-like text", () => {
    const parts = extractParts(`
      Parts List
      A 1PC  B 1PC  H M6*50mm 4PCS  I M6*35mm 6PCS  Q 5PCS
      L 1PC hex key
    `);
    expect(parts.find((p) => p.id === "H")?.qty).toBe(4);
    expect(parts.find((p) => p.id === "H")?.name).toMatch(/M6x50/i);
    expect(parts.find((p) => p.id === "L")?.kind).toBe("tool");
  });
});

describe("analyzeVideo + merge", () => {
  it("gap-fills from the recorded fixture and flags H-bolt quantity conflict", async () => {
    const manual = await parseManual("MagicH sample", [
      photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
      photo("p-04.jpg", "public/golden/pages/p-04.jpg"),
    ]);
    const video = await analyzeVideo(manual, { youtubeUrl: SAMPLE_YOUTUBE_URL });
    expect(video).toBeTruthy();
    expect(video!.fetchStatus).toBe("fixture");
    expect(video!.beats.some((b) => b.kind === "gap_fill" && b.action?.provenance === "inferred_from_video")).toBe(true);
    expect(video!.beats.some((b) => b.kind === "conflict" && /H/.test(`${b.detail}${b.videoClaim}`))).toBe(true);

    const merged = mergeSources({
      title: "MagicH sample",
      guideId: "sample",
      product: manual.product ?? { brand: "Newtral", model: "MagicH", category: "office chair" },
      manual,
      video,
    });
    const valid = assertGuide(merged);
    const mech = valid.steps.find((s) => /mechanism/i.test(s.title));
    expect(mech?.actions[0].detail).not.toMatch(/six H/i);
    expect(listFills(valid).length).toBeGreaterThan(0);
    expect(listConflicts(valid).length).toBeGreaterThan(0);
  });

  it("ignores music-only captions and still derives teaching from visuals + manual", async () => {
    const manual = await parseManual("MagicH sample", [
      photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
      photo("p-04.jpg", "public/golden/pages/p-04.jpg"),
    ]);
    const video = await analyzeVideo(manual, { youtubeUrl: "https://youtu.be/musicstub" }, {
      observation: sampleMusicObservation({ youtubeUrl: "https://youtu.be/musicstub" }),
    });
    expect(video!.log.some((l) => /music/i.test(l))).toBe(true);
    const blob = JSON.stringify(video!.beats);
    expect(blob).not.toMatch(/la la|yeah yeah|chorus/i);
    expect(video!.beats.every((b) => b.kind !== "conflict" || !/lyrics/i.test(b.videoClaim ?? ""))).toBe(true);
  });

  it("returns null when no video locator is given", async () => {
    const manual = await parseManual("MagicH sample", [
      photo("parts-list.jpg", "public/fixtures/parts-list.jpg"),
    ]);
    expect(await analyzeVideo(manual, {})).toBeNull();
  });
});
