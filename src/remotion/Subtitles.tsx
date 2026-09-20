import type { FC } from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { cueAt, cues as cuesFromText, type Cue } from "../lib/sentences";
import { T } from "./theme";

interface Props {
  text?: string;
  from?: number;
  to?: number;
  cues?: Cue[];
  width: number;
}

/** One sentence at a time. When TTS files exist, cue windows match audio duration. */
export const Subtitles: FC<Props> = ({ text, from, to, cues: given, width }) => {
  const frame = useCurrentFrame();
  const list = given ?? (text != null && from != null && to != null ? cuesFromText(text, from, to) : []);
  const cue = cueAt(list, frame);
  if (!cue) return null;
  const fade = interpolate(frame, [cue.from, cue.from + 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ width, padding: "0 56px", opacity: fade }}>
      <div style={{ fontFamily: T.font, fontSize: 40, lineHeight: 1.3, color: T.ink }}>{cue.text}</div>
    </div>
  );
};
