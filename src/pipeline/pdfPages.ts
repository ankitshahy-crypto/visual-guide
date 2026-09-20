import type { PDFPageProxy } from "pdfjs-dist";
import type { SourcePage } from "../types/guide";
import type { UploadFile } from "./types";

export interface RasterPage extends SourcePage {
  text: string;
}

let workerConfigured = false;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    try {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    } catch {
      // Vitest / node: fake worker
    }
    workerConfigured = true;
  }
  return pdfjs;
}

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Split a PDF into page images (JPEG data URLs) plus the text layer.
 * Requires a canvas (browser). Tests should stub this.
 */
export async function rasterizePdf(file: UploadFile, startPageIndex: number): Promise<RasterPage[]> {
  const pdfjs = await loadPdfJs();
  const data = dataUrlToUint8(file.dataUrl);
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: RasterPage[] = [];
  const max = Math.min(doc.numPages, 40);
  for (let n = 1; n <= max; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1.3 });
    const image = await renderPage(page, viewport);
    const text = await readTextLayer(page);
    out.push({
      page: String(startPageIndex + out.length + 1),
      label: `${file.name} p.${n}`,
      image: image ?? file.dataUrl,
      width: Math.max(1, Math.round(viewport.width)),
      height: Math.max(1, Math.round(viewport.height)),
      text,
    });
  }
  return out;
}

async function renderPage(page: PDFPageProxy, viewport: ReturnType<PDFPageProxy["getViewport"]>): Promise<string | null> {
  const w = Math.max(1, Math.round(viewport.width));
  const h = Math.max(1, Math.round(viewport.height));
  const canvas = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(w, h)
    : (typeof document !== "undefined" ? document.createElement("canvas") : null);
  if (!canvas) return null;
  (canvas as HTMLCanvasElement).width = w;
  (canvas as HTMLCanvasElement).height = h;
  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
  if (!ctx) return null;
  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
  if ("toDataURL" in canvas) return (canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.85);
  if ("convertToBlob" in canvas) {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: 0.85 });
    return blobToDataUrl(blob);
  }
  return null;
}

async function readTextLayer(page: PDFPageProxy): Promise<string> {
  try {
    const content = await page.getTextContent();
    return content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
