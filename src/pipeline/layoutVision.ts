import type { DecodedImage } from "./imageDecode";

export interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LayoutCues {
  width: number;
  height: number;
  orangeBadges: PixelBox[];
  looksLikePartsGrid: boolean;
  partsColumns: number;
  partsRows: number;
  darkBadges: PixelBox[];
  looksLikeQuadSteps: boolean;
  log: string[];
}

/** Orange used for letter tags in the MagicH / Newtral parts list (#f0552b). */
function isLetterOrange(r: number, g: number, b: number): boolean {
  return r > 175 && g > 30 && g < 150 && b < 100 && r > g + 50 && r > b + 80;
}

function isFilledDark(r: number, g: number, b: number): boolean {
  return r < 45 && g < 45 && b < 45;
}

/**
 * Lightweight page vision: letter-tag orange squares and filled step-number boxes.
 * No cloud key required. Tuned for high-contrast printed manuals.
 */
export function readLayoutCues(img: DecodedImage): LayoutCues {
  const log: string[] = [];
  const orange = connectedBoxes(img, isLetterOrange, { minArea: 80, maxArea: 3500, maxAspect: 1.8 });
  const orangeGrid = clusterGrid(orange, img.width, img.height);
  const looksLikePartsGrid = orangeGrid.cells.length >= 8 && orangeGrid.columns >= 3;

  // Step index badges are small filled black squares, not the QR or grid lines.
  const dark = connectedBoxes(img, isFilledDark, {
    minArea: 180,
    maxArea: Math.floor(img.width * img.height * 0.012),
    maxAspect: 1.45,
    minFill: 0.55,
  }).filter((b) => {
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const cy = (b.y0 + b.y1) / 2 / img.height;
    const cx = (b.x0 + b.x1) / 2 / img.width;
    if (w < 14 || h < 14) return false;
    if (w > img.width * 0.12 || h > img.height * 0.08) return false;
    // ignore header QR (top-right) and footer page numbers
    if (cy < 0.12 && cx > 0.72) return false;
    if (cy > 0.93) return false;
    return true;
  });

  const quad = dark.length >= 3 && dark.length <= 8;
  if (looksLikePartsGrid) {
    log.push(`orange letter tags: ${orangeGrid.cells.length} in ${orangeGrid.rows}×${orangeGrid.columns} grid`);
  } else if (orange.length) {
    log.push(`orange blobs: ${orange.length} (not a parts grid)`);
  }
  if (dark.length) log.push(`dark step badges: ${dark.length}`);

  return {
    width: img.width,
    height: img.height,
    orangeBadges: orangeGrid.cells,
    looksLikePartsGrid,
    partsColumns: orangeGrid.columns,
    partsRows: orangeGrid.rows,
    darkBadges: dark,
    looksLikeQuadSteps: quad,
    log,
  };
}

function connectedBoxes(
  img: DecodedImage,
  match: (r: number, g: number, b: number) => boolean,
  opts: { minArea: number; maxArea: number; maxAspect: number; minFill?: number },
): PixelBox[] {
  const { width: w, height: h, data } = img;
  const seen = new Uint8Array(w * h);
  const boxes: PixelBox[] = [];
  const stack: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (seen[start]) continue;
      const p = start * 4;
      if (!match(data[p], data[p + 1], data[p + 2])) {
        seen[start] = 1;
        continue;
      }
      stack.length = 0;
      stack.push(start);
      seen[start] = 1;
      let minX = x, maxX = x, minY = y, maxY = y, area = 0;
      while (stack.length) {
        const i = stack.pop()!;
        area++;
        const cx = i % w;
        const cy = (i - cx) / w;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        tryPush(cx + 1, cy);
        tryPush(cx - 1, cy);
        tryPush(cx, cy + 1);
        tryPush(cx, cy - 1);
      }
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw > bh ? bw / bh : bh / bw;
      const fill = area / (bw * bh);
      if (area < opts.minArea || area > opts.maxArea) continue;
      if (aspect > opts.maxAspect) continue;
      if (opts.minFill != null && fill < opts.minFill) continue;
      boxes.push({ x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 });
    }
  }

  function tryPush(px: number, py: number): void {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const i = py * w + px;
    if (seen[i]) return;
    const p = i * 4;
    if (!match(data[p], data[p + 1], data[p + 2])) {
      seen[i] = 1;
      return;
    }
    seen[i] = 1;
    stack.push(i);
  }

  return boxes;
}

function clusterGrid(boxes: PixelBox[], pageW: number, pageH: number): { cells: PixelBox[]; columns: number; rows: number } {
  if (boxes.length < 4) return { cells: boxes, columns: 0, rows: 0 };
  const sorted = [...boxes].sort((a, b) => {
    const ay = (a.y0 + a.y1) / 2;
    const by = (b.y0 + b.y1) / 2;
    if (Math.abs(ay - by) > pageH * 0.04) return ay - by;
    return (a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2;
  });
  const rows: PixelBox[][] = [];
  for (const b of sorted) {
    const cy = (b.y0 + b.y1) / 2;
    const row = rows.find((r) => Math.abs((r[0].y0 + r[0].y1) / 2 - cy) < pageH * 0.05);
    if (row) row.push(b);
    else rows.push([b]);
  }
  const colCounts = rows.map((r) => r.length);
  const columns = mode(colCounts);
  if (columns < 3) return { cells: sorted, columns: 0, rows: 0 };
  const even = rows.every((r, i) => {
    if (i === rows.length - 1) return r.length >= 1 && r.length <= columns;
    return Math.abs(r.length - columns) <= 1;
  });
  if (!even) return { cells: sorted, columns: 0, rows: 0 };
  const cells = rows.flatMap((r) => r.sort((a, b) => a.x0 - b.x0));
  return { cells, columns, rows: rows.length };
}

function mode(xs: number[]): number {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0;
}

export function partsLettersFromGrid(count: number): string[] {
  const letters: string[] = [];
  for (let i = 0; i < 26 && letters.length < count; i++) {
    const ch = String.fromCharCode(65 + i);
    if (ch === "O") continue; // manuals often skip O
    letters.push(ch);
  }
  return letters;
}
