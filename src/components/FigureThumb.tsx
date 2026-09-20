import type { Guide, Step } from "../types/guide";
import { pageByKey } from "../types/guide";
import { asBBox, computeCrop } from "../lib/crop";
import { pageImageUrl } from "../lib/pageImage";

interface Props {
  guide: Guide;
  step?: Step;
  size?: number;
  className?: string;
}

export default function FigureThumb({ guide, step, size = 80, className = "" }: Props) {
  const page = step?.figure ? pageByKey(guide, step.figure.page) : undefined;
  if (!step?.figure || !page) {
    return <div className={`shrink-0 border border-ink bg-paper ${className}`} style={{ width: size, height: size }} />;
  }
  const aspect = page.width && page.height ? page.width / page.height : 0.7;
  const c = computeCrop({ w: size, h: size, bbox: asBBox(step.figure.bbox), aspect });
  return (
    <div className={`relative shrink-0 overflow-hidden border border-ink bg-paper ${className}`} style={{ width: size, height: size }}>
      <img
        src={pageImageUrl(page.image)}
        alt=""
        className="absolute max-w-none"
        style={{ width: c.pageW, height: c.pageH, left: c.left, top: c.top }}
      />
    </div>
  );
}
