import type { FC } from "react";
import { Img, staticFile } from "remotion";
import { computeCrop } from "../lib/crop";
import { isInlineImage, pageImagePath } from "../lib/pageImage";
import type { BBox } from "../types/guide";
import { T } from "./theme";

interface Props {
  image: string;          // SourcePage.image, e.g. "pages/p-04.jpg" or "golden/pages/p-04.jpg"
  bbox: BBox;
  aspect: number;
  w: number;
  h: number;
  zoom?: number;
  highlights?: BBox[];    // normalized page regions to ring
  ringProgress?: number;  // 0..1 — ring draws on
}

/** Shows one region of a manual page, zoomed to fit, with optional highlight rings. */
export const FigureCrop: FC<Props> = ({ image, bbox, aspect, w, h, zoom = 1, highlights = [], ringProgress = 1 }) => {
  const c = computeCrop({ w, h, bbox, aspect, zoom });
  const src = pageImagePath(image);
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", background: T.paper }}>
      <Img
        src={isInlineImage(src) ? src : staticFile(src)}
        style={{ position: "absolute", width: c.pageW, height: c.pageH, left: c.left, top: c.top }}
      />
      {/* mask everything outside the figure so neighbouring panels never show */}
      {(() => {
        const a = c.toPx(bbox[0], bbox[1]);
        const b = c.toPx(bbox[2], bbox[3]);
        const m = { position: "absolute" as const, background: T.paper };
        return (
          <>
            <div style={{ ...m, left: 0, top: 0, width: w, height: Math.max(0, a.y) }} />
            <div style={{ ...m, left: 0, top: b.y, width: w, height: Math.max(0, h - b.y) }} />
            <div style={{ ...m, left: 0, top: 0, width: Math.max(0, a.x), height: h }} />
            <div style={{ ...m, left: b.x, top: 0, width: Math.max(0, w - b.x), height: h }} />
          </>
        );
      })()}
      {highlights.map((hb, i) => {
        const a = c.toPx(hb[0], hb[1]);
        const b = c.toPx(hb[2], hb[3]);
        const pad = 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: a.x - pad, top: a.y - pad,
              width: b.x - a.x + pad * 2, height: b.y - a.y + pad * 2,
              border: `5px solid ${T.action}`,
              borderRadius: 999,
              opacity: ringProgress,
              transform: `scale(${0.85 + 0.15 * ringProgress})`,
            }}
          />
        );
      })}
    </div>
  );
};
