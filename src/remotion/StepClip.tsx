import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { Guide, NarrationLevel, Step } from "../types/guide";
import { FigureAction } from "./templates/FigureAction";
import { PartsOverview } from "./templates/PartsOverview";
import { T } from "./theme";

export interface StepClipProps { step: Step; guide: Guide; level: NarrationLevel }

/** One step == one clip. Dispatches on template; the same component runs in the Player and the renderer. */
export const StepClip: FC<StepClipProps> = (props) => {
  // TTS audio: add <Audio src={staticFile(`narration/${props.step.id}-${props.level}.mp3`)} />
  // once the creator pipeline writes those files.
  switch (props.step.template) {
    case "parts_overview":
      return <PartsOverview {...props} />;
    case "figure_action":
    case "options":
      return <FigureAction {...props} />;
    default:
      return (
        <AbsoluteFill style={{ background: T.paper, fontFamily: T.font, padding: 56, fontSize: 40 }}>
          {props.step.title}
        </AbsoluteFill>
      );
  }
};
