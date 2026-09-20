import { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { Guide, NarrationLevel, Step } from "../types/guide";
import { CLIP_H, CLIP_W, FPS, clipFrames } from "../lib/timing";
import { StepClip } from "../remotion/StepClip";

interface Props {
  guide: Guide;
  step: Step;
  level: NarrationLevel;
  autoPlay: boolean;
  replayKey: number;
  onEnded: () => void;
  controls?: boolean;
}

/** The same StepClip the renderer uses, played live in the browser. */
export default function StepPlayer({ guide, step, level, autoPlay, replayKey, onEnded, controls = false }: Props) {
  const ref = useRef<PlayerRef>(null);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    p.addEventListener("ended", onEnded);
    return () => p.removeEventListener("ended", onEnded);
  }, [onEnded, step.id, replayKey]);

  useEffect(() => {
    if (autoPlay) ref.current?.play();
  }, [autoPlay, step.id, replayKey]);

  return (
    <div className="w-full bg-paper" style={{ aspectRatio: `${CLIP_W} / ${CLIP_H}` }}>
      <Player
        key={`${step.id}-${level}-${replayKey}`}
        ref={ref}
        component={StepClip}
        inputProps={{ step, guide, level }}
        durationInFrames={clipFrames(step)}
        fps={FPS}
        compositionWidth={CLIP_W}
        compositionHeight={CLIP_H}
        controls={controls}
        autoPlay={autoPlay}
        clickToPlay
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
