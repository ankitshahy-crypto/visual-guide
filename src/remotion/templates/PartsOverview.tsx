import type { FC } from "react";
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Check } from "lucide-react";
import type { Guide, NarrationLevel, Step } from "../../types/guide";
import { CLIP_H, CLIP_W, schedule } from "../../lib/timing";
import type { Cue } from "../../lib/sentences";
import { StepHeader } from "../StepHeader";
import { Subtitles } from "../Subtitles";
import { T } from "../theme";

interface Props { step: Step; guide: Guide; level: NarrationLevel; cues?: Cue[] }

const PAD = 56;
const HEADER_H = 180;
const SUB_H = 190;
const NOTE_H = 110;

/** The parts list as a grid of letter tags — the checklist the user ticks against the bag. */
export const PartsOverview: FC<Props> = ({ step, guide, level, cues }) => {
  const sch = schedule(step);
  const parts = guide.parts;
  const cols = 4;
  const gridW = CLIP_W - PAD * 2;
  const gap = 16;
  const tileW = (gridW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(parts.length / cols);
  const gridH = CLIP_H - HEADER_H - NOTE_H - SUB_H - 24;
  const tileH = Math.min(150, (gridH - gap * (rows - 1)) / rows);
  const manualTip = step.tips.find((t) => t.provenance === "manual");

  return (
    <AbsoluteFill style={{ background: T.paper, fontFamily: T.font }}>
      <StepHeader step={step} width={CLIP_W} />
      <div style={{ position: "absolute", top: HEADER_H, left: PAD, width: gridW, display: "flex", flexWrap: "wrap", gap }}>
        {parts.map((p) => {
          const tool = p.kind === "tool";
          return (
            <div key={p.id} style={{ width: tileW, height: tileH, border: tool ? `2px dashed ${T.ash}` : `2px solid ${T.ink}`, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ background: tool ? T.paper : T.ink, color: tool ? T.ink : T.paper, fontWeight: 700, fontSize: 28, width: 48, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.id}</div>
                <div style={{ fontSize: 24, color: T.ash, paddingRight: 10 }}>×{p.qty}</div>
              </div>
              <div style={{ padding: "8px 10px", fontSize: 22, lineHeight: 1.2, color: T.ink }}>{p.name}</div>
            </div>
          );
        })}
      </div>
      {manualTip ? (
        <div style={{ position: "absolute", left: PAD, right: PAD, bottom: SUB_H + 12, height: NOTE_H - 24, display: "flex", alignItems: "center", gap: 16, borderLeft: `8px solid ${T.action}`, paddingLeft: 18, fontSize: 28, color: T.ink }}>
          {manualTip.text}
        </div>
      ) : null}
      {sch.checkpoint && step.checkpoint ? (
        <Sequence from={sch.checkpoint.from} durationInFrames={sch.checkpoint.dur} layout="none">
          <CheckBand text={step.checkpoint} />
        </Sequence>
      ) : null}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: CLIP_W, height: SUB_H, display: "flex", alignItems: "center", borderTop: `2px solid ${T.rule}` }}>
        <Subtitles text={step.narration[level]} from={sch.body.from} to={sch.total} cues={cues} width={CLIP_W} />
      </div>
    </AbsoluteFill>
  );
};

const CheckBand: FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: PAD, right: PAD, bottom: SUB_H + 12, height: NOTE_H - 24, background: T.check, color: T.paper, display: "flex", alignItems: "center", gap: 20, padding: "0 20px", opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
      <Check size={48} strokeWidth={3} />
      <div style={{ fontSize: 28, lineHeight: 1.25 }}>{text}</div>
    </div>
  );
};
