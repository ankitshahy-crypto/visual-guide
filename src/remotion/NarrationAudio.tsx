import type { FC } from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { AudioClip } from "../lib/narrationAudio";

function remotionSrc(src: string): string {
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  return staticFile(src.replace(/^\//, ""));
}

/** Play cached narration in both the Player and `remotion render`. */
export const NarrationAudio: FC<{ clips: AudioClip[] }> = ({ clips }) => {
  if (!clips.length) return null;
  return (
    <>
      {clips.map((clip) => (
        <Sequence key={`${clip.src}-${clip.from}`} from={clip.from} durationInFrames={clip.dur} layout="none">
          <Audio
            src={remotionSrc(clip.src)}
            playbackRate={clip.playbackRate === 1 ? undefined : clip.playbackRate}
            pauseWhenBuffering
          />
        </Sequence>
      ))}
    </>
  );
};
