import type { FC } from "react";
import { Audio, Sequence } from "remotion";
import type { AudioClip } from "../lib/narrationAudio";
import { remotionPublicSrc } from "../lib/remotionSrc";

/** Play cached narration in both the Player and `remotion render`. */
export const NarrationAudio: FC<{ clips: AudioClip[] }> = ({ clips }) => {
  if (!clips.length) return null;
  return (
    <>
      {clips.map((clip) => (
        <Sequence key={`${clip.src}-${clip.from}`} from={clip.from} durationInFrames={clip.dur} layout="none">
          <Audio
            src={remotionPublicSrc(clip.src)}
            playbackRate={clip.playbackRate === 1 ? undefined : clip.playbackRate}
            pauseWhenBuffering
          />
        </Sequence>
      ))}
    </>
  );
};
