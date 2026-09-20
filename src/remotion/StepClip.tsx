import { AbsoluteFill } from "remotion";
import type { FC } from "react";
import type { Guide, NarrationLevel, Step } from "../types/guide";
import type { ResolvedAudioLine } from "../lib/narrationAudio";
import { planNarration, resolveLinesFromIndex } from "../lib/narrationAudio";
import { schedule } from "../lib/timing";
import { FigureAction } from "./templates/FigureAction";
import { PartsOverview } from "./templates/PartsOverview";
import { NarrationAudio } from "./NarrationAudio";
import { T } from "./theme";

export interface StepClipProps {
  step: Step;
  guide: Guide;
  level: NarrationLevel;
  /** Player-resolved clips. Render/studio look up the committed hash index. */
  audio?: ResolvedAudioLine[] | null;
}

/** One step == one clip. Dispatches on template; the same component runs in the Player and the renderer. */
export const StepClip: FC<StepClipProps> = (props) => {
  const sch = schedule(props.step);
  const text = props.step.narration[props.level];
  const resolved = props.audio ?? resolveLinesFromIndex(text);
  const plan = planNarration(text, sch.body.from, sch.total, resolved);

  let body;
  switch (props.step.template) {
    case "parts_overview":
      body = <PartsOverview step={props.step} guide={props.guide} level={props.level} cues={plan.cues} />;
      break;
    case "figure_action":
    case "options":
      body = <FigureAction step={props.step} guide={props.guide} level={props.level} cues={plan.cues} />;
      break;
    default:
      body = (
        <AbsoluteFill style={{ background: T.paper, fontFamily: T.font, padding: 56, fontSize: 40 }}>
          {props.step.title}
        </AbsoluteFill>
      );
  }

  return (
    <AbsoluteFill>
      {body}
      <NarrationAudio clips={plan.clips} />
    </AbsoluteFill>
  );
};
