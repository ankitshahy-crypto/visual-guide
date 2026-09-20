import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function src(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Analyzing / pipeline chunks on GitHub Pages", () => {
  it("uses static imports on the creator path so Vite does not emit lazy /assets/ chunks", () => {
    const decode = src("src/pipeline/imageDecode.ts");
    const parse = src("src/pipeline/parseManual.ts");
    const pdf = src("src/pipeline/pdfPages.ts");
    const analyzing = src("src/pages/Analyzing.tsx");
    const figure = src("src/remotion/FigureCrop.tsx");
    const audio = src("src/remotion/NarrationAudio.tsx");

    expect(decode).toMatch(/import \* as jpegJs from ["']jpeg-js["']/);
    expect(decode).not.toMatch(/import\(["']jpeg-js["']\)/);

    expect(parse).toMatch(/import \{ rasterizePdf as rasterizePdfImpl \} from ["']\.\/pdfPages["']/);
    expect(parse).not.toMatch(/import\(["']\.\/pdfPages["']\)/);

    expect(pdf).toMatch(/import \* as pdfjs from ["']pdfjs-dist["']/);
    expect(pdf).toMatch(/from ["']pdfjs-dist\/build\/pdf\.worker\.min\.mjs\?url["']/);
    expect(pdf).not.toMatch(/import\(["']pdfjs-dist/);

    expect(analyzing).toMatch(/from ["']\.\.\/pipeline\/runPipeline["']/);
    expect(figure).not.toMatch(/staticFile\(/);
    expect(figure).toMatch(/pageImageUrl\(/);
    expect(audio).not.toMatch(/staticFile\(/);
    expect(audio).toMatch(/remotionPublicSrc\(/);
  });

  it("keeps Capacitor plugins as the only remaining web-shell dynamic imports", () => {
    const native = src("src/native/initNative.ts");
    expect(native).toContain('await import("@capacitor/status-bar")');
    expect(native).toContain('await import("@capacitor/splash-screen")');
    expect(native).toContain('await import("@capacitor/keyboard")');
    expect(native).toContain("if (!isNativeApp()) return");
  });

  it("checks the Pages build for prefixed chunks after vite build", () => {
    const workflow = src(".github/workflows/pages.yml");
    const script = src("scripts/check-pages-chunks.mjs");
    expect(workflow).toContain("scripts/check-pages-chunks.mjs");
    expect(workflow).toContain("VITE_BASE: /visual-guide/");
    expect(script).toContain("/visual-guide/");
    expect(script).toContain('import("jpeg-js")');
    expect(script).toContain('import("pdfjs-dist")');
  });
});
