import type { FC } from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { cueAt, cues } from "../lib/sentences";
import { T } from "./theme";

interface Props { text: string; from: number; to: number; width: number }

/** One sentence at a time, timed by sentence length. Becomes audio-synced once TTS lands. */
export const Subtitles: FC<Props> = ({ text, from, to, width }) => {
  const frame = useCurrentFrame();
  const list = cues(text, from, to);
  const cue = cueAt(list, frame);
  if (!cue) return null;
  const fade = interpolate(frame, [cue.from, cue.from + 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ width, padding: "0 56px", opacity: fade }}>
      <div style={{ fontFamily: T.font, fontSize: 40, lineHeight: 1.3, color: T.ink }}>{cue.text}</div>
    </div>
  );
};
