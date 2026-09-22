import type { FC } from "react";
import { Img } from "remotion";
import { remotionPublicSrc } from "../lib/remotionSrc";
import { T } from "./theme";

interface Props {
  src: string;
  w: number;
  h: number;
  zoom?: number;
}

/** Full-bleed generated photo. Used only when a realistic still is bundled for this step. */
export const RealisticStill: FC<Props> = ({ src, w, h, zoom = 1 }) => {
  return (
    <div style={{ width: w, height: h, overflow: "hidden", background: T.paper }}>
      <Img
        src={remotionPublicSrc(src)}
        style={{
          width: w,
          height: h,
          objectFit: "contain",
          transform: `scale(${zoom})`,
          background: T.paper,
        }}
      />
    </div>
  );
};
