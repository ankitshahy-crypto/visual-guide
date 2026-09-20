import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pageImageUrl } from "./pageImage";
import { publicAudioSrc } from "./narrationAudio";
import { publicUrl } from "./publicUrl";

const root = resolve(import.meta.dirname, "../..");

describe("public asset URLs", () => {
  it("prefixes Vite BASE_URL so Pages /visual-guide/ assets do not 404", () => {
    const base = import.meta.env.BASE_URL || "./";
    const prefix = base === "./" || base === "." ? "./" : base.endsWith("/") ? base : `${base}/`;
    expect(publicUrl("narration/abc.mp3")).toBe(`${prefix}narration/abc.mp3`);
    expect(publicAudioSrc("/narration/abc.mp3")).toBe(`${prefix}narration/abc.mp3`);
    expect(pageImageUrl("pages/p-01.jpg")).toBe(`${prefix}golden/pages/p-01.jpg`);
    expect(pageImageUrl("https://example.com/x.jpg")).toBe("https://example.com/x.jpg");
    expect(publicUrl("narration/abc.mp3")).not.toBe("/visual-guide/narration/abc.mp3");
  });
});

describe("GitHub Pages host", () => {
  it("builds the project site at /visual-guide/ from main", () => {
    const vite = readFileSync(resolve(root, "vite.config.ts"), "utf8");
    const workflow = readFileSync(resolve(root, ".github/workflows/pages.yml"), "utf8");
    expect(vite).toContain("process.env.VITE_BASE");
    expect(vite).toContain('base: pagesBase ?? "./"');
    expect(vite).toContain("dist/404.html");
    expect(workflow).toContain("VITE_BASE: /visual-guide/");
    expect(workflow).toContain("actions/deploy-pages@v4");
    expect(workflow).toContain("ankitshahy-crypto.github.io/visual-guide");
    expect(workflow).toContain("branches: [main]");
  });
});
