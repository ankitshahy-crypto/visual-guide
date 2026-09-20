import type { ComponentType, FC } from "react";
import { Composition, Folder } from "remotion";
import golden from "../data/golden/newtral-magich-pro.json";
import { CLIP_H, CLIP_W, FPS, clipFrames } from "../lib/timing";
import { assertGuide } from "../lib/validate";
import { StepClip, type StepClipProps } from "./StepClip";

const guide = assertGuide(golden);
const Clip = StepClip as unknown as ComponentType<Record<string, unknown>>;

/** One composition per step so `remotion render <id>` and the studio can target any clip. */
export const RemotionRoot: FC = () => (
  <Folder name={guide.guide_id}>
    {guide.steps.map((step) => (
      <Composition
        key={step.id}
        id={`clip-${step.id}`}
        component={Clip}
        durationInFrames={clipFrames(step)}
        fps={FPS}
        width={CLIP_W}
        height={CLIP_H}
        defaultProps={{ step, guide, level: "standard" } satisfies StepClipProps}
      />
    ))}
  </Folder>
);
