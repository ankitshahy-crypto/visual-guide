import type { BBox } from "../types/guide";

export interface CropInput {
  w: number;        // container width  (px)
  h: number;        // container height (px)
  bbox: BBox;       // normalized region of the page to show
  aspect: number;   // page width / page height
  zoom?: number;    // 1 = region fits container; >1 zooms into its center
}

export interface CropResult {
  pageW: number; pageH: number; left: number; top: number;
  /** map a normalized page point to container px */
  toPx: (nx: number, ny: number) => { x: number; y: number };
}

/** Pure math shared by the clip (Remotion <Img>) and the step-list thumbnail (<img>). */
export function computeCrop({ w, h, bbox, aspect, zoom = 1 }: CropInput): CropResult {
  const [x0, y0, x1, y1] = bbox;
  const rw = Math.max(1e-4, x1 - x0);
  const rh = Math.max(1e-4, y1 - y0);
  // largest page width such that the region fits inside w×h
  const pageW = Math.min(w / rw, (h * aspect) / rh) * zoom;
  const pageH = pageW / aspect;
  const cx = x0 + rw / 2;
  const cy = y0 + rh / 2;
  const left = w / 2 - cx * pageW;
  const top = h / 2 - cy * pageH;
  return {
    pageW, pageH, left, top,
    toPx: (nx, ny) => ({ x: left + nx * pageW, y: top + ny * pageH }),
  };
}

export function asBBox(v: number[]): BBox {
  return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 1, v[3] ?? 1];
}
