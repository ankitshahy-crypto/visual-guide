import * as jpegJs from "jpeg-js";

/** Decode data-URL images without a DOM (jpeg-js) so vision runs in tests and the browser. */

export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

type JpegDecode = (
  bytes: Uint8Array,
  opts: { useTArray: boolean; maxMemoryUsageInMB: number },
) => { width: number; height: number; data: Uint8Array };

function jpegDecode(): JpegDecode | undefined {
  const mod = jpegJs as { decode?: JpegDecode; default?: { decode?: JpegDecode } };
  return mod.decode ?? mod.default?.decode;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function isJpegDataUrl(dataUrl: string): boolean {
  return /^data:image\/jpeg/i.test(dataUrl) || jpegMagic(dataUrl);
}

function jpegMagic(dataUrl: string): boolean {
  try {
    const bytes = dataUrlToBytes(dataUrl);
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
  } catch {
    return false;
  }
}

export async function decodeImage(dataUrl: string): Promise<DecodedImage | null> {
  if (isJpegDataUrl(dataUrl) || !dataUrl.startsWith("data:image/png")) {
    try {
      const decode = jpegDecode();
      if (!decode) throw new Error("jpeg-js decode missing");
      const raw = decode(dataUrlToBytes(dataUrl), { useTArray: true, maxMemoryUsageInMB: 64 });
      if (raw.width >= 1 && raw.height >= 1) {
        return { width: raw.width, height: raw.height, data: raw.data as Uint8Array };
      }
    } catch {
      // fall through to bitmap
    }
  }
  return decodeViaBitmap(dataUrl);
}

async function decodeViaBitmap(dataUrl: string): Promise<DecodedImage | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (typeof createImageBitmap !== "function") return null;
    const bmp = await createImageBitmap(blob);
    const canvas = typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(bmp.width, bmp.height)
      : (typeof document !== "undefined" ? document.createElement("canvas") : null);
    if (!canvas) {
      bmp.close();
      return null;
    }
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
    if (!ctx || !("drawImage" in ctx)) {
      bmp.close();
      return null;
    }
    (ctx as CanvasRenderingContext2D).drawImage(bmp, 0, 0);
    const img = (ctx as CanvasRenderingContext2D).getImageData(0, 0, bmp.width, bmp.height);
    bmp.close();
    return { width: img.width, height: img.height, data: img.data as unknown as Uint8Array };
  } catch {
    return null;
  }
}
