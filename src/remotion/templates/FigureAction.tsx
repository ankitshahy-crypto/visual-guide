import type { FC, ReactNode } from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AlertTriangle, Check } from "lucide-react";
import type { Guide, NarrationLevel, Step } from "../../types/guide";
import { pageByKey, partById } from "../../types/guide";
import { CLIP_H, CLIP_W, schedule } from "../../lib/timing";
import { asBBox } from "../../lib/crop";
import { verbIcon, verbLabel } from "../../lib/verbs";
import { FigureCrop } from "../FigureCrop";
import { StepHeader } from "../StepHeader";
import { Subtitles } from "../Subtitles";
import { T, box } from "../theme";

interface Props { step: Step; guide: Guide; level: NarrationLevel }

const PAD = 56;
const HEADER_H = 180;
const CHIPS_H = 130;
const CAPTION_H = 230;
const SUB_H = 190;
const FIG_TOP = HEADER_H + CHIPS_H;
const FIG_H = CLIP_H - FIG_TOP - CAPTION_H - SUB_H;

export const FigureAction: FC<Props> = ({ step, guide, level }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sch = schedule(step);

  const page = step.figure ? pageByKey(guide, step.figure.page) : undefined;
  const aspect = page?.width && page?.height ? page.width / page.height : 0.7;
  const zoom = interpolate(frame, [sch.body.from, sch.total], [1.0, 1.14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring = spring({ frame: frame - sch.body.from - 10, fps, config: { damping: 14 } });

  const chips = step.parts_used.map((r) => ({ ref: r, part: partById(guide, r.id) }));

  return (
    <AbsoluteFill style={{ background: T.paper, fontFamily: T.font }}>
      <StepHeader step={step} width={CLIP_W} />

      {/* parts used, as the manual's letter tags — visible on frame 0 so a paused clip still reads */}
      <div style={{ position: "absolute", top: HEADER_H, left: PAD, right: PAD, height: CHIPS_H, display: "flex", gap: 14, alignContent: "flex-start", flexWrap: "wrap", overflow: "hidden", paddingTop: 6 }}>
        {chips.map(({ ref, part }) => {
          return (
            <div key={ref.id} style={{ ...box({ borderWidth: 2 }), display: "flex", alignItems: "center", height: 56 }}>
              <div style={{ background: T.ink, color: T.paper, fontWeight: 700, fontSize: 28, width: 52, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{ref.id}</div>
              <div style={{ padding: "0 16px", fontSize: 26, color: T.ink }}>
                {part?.name ?? ref.id}{ref.qty > 1 ? ` ×${ref.qty}` : ""}
              </div>
            </div>
          );
        })}
        {step.tools.map((t) => {
          const part = partById(guide, t);
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", height: 56, border: `2px dashed ${T.ash}` }}>
              <div style={{ color: T.ink, fontWeight: 700, fontSize: 28, width: 52, textAlign: "center" }}>{t}</div>
              <div style={{ padding: "0 16px 0 4px", fontSize: 26, color: T.ash }}>{part?.name ?? "tool"}</div>
            </div>
          );
        })}
      </div>

      {/* the manual's own drawing, zoomed to this step */}
      <div style={{ position: "absolute", top: FIG_TOP, left: 0, width: CLIP_W, height: FIG_H }}>
        {step.figure && page ? (
          <FigureCrop
            image={page.image}
            bbox={asBBox(step.figure.bbox)}
            aspect={aspect}
            w={CLIP_W}
            h={FIG_H}
            zoom={zoom}
            highlights={(step.figure.highlights ?? []).map(asBBox)}
            ringProgress={ring}
          />
        ) : null}
        {step.warnings.length > 0 ? (
          <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 16, display: "flex", gap: 14, alignItems: "center", background: T.paper, border: `3px solid ${T.action}`, padding: "12px 18px" }}>
            <AlertTriangle size={40} color={T.action} strokeWidth={2.5} />
            <div style={{ fontSize: 28, color: T.ink, lineHeight: 1.25 }}>{step.warnings[0].text}</div>
          </div>
        ) : null}
      </div>

      {/* one caption beat per action */}
      <div style={{ position: "absolute", top: FIG_TOP + FIG_H, left: PAD, right: PAD, height: CAPTION_H }}>
        {step.actions.map((a, i) => {
          const span = sch.actions[i];
          if (!span) return null;
          const Icon = verbIcon[a.verb];
          return (
            <Sequence key={i} from={span.from} durationInFrames={span.dur} layout="none">
              <Caption
                icon={<Icon size={44} color={T.paper} strokeWidth={2.5} />}
                label={verbLabel[a.verb] + (a.qty && a.qty > 1 ? ` ×${a.qty}` : "")}
                text={a.detail}
                count={`${i + 1} of ${step.actions.length}`}
              />
            </Sequence>
          );
        })}
        {sch.options && step.options ? (
          <Sequence from={sch.options.from} durationInFrames={sch.options.dur} layout="none">
            <Choices prompt={step.options.prompt} choices={step.options.choices} def={step.options.default} />
          </Sequence>
        ) : null}
        {sch.checkpoint && step.checkpoint ? (
          <Sequence from={sch.checkpoint.from} durationInFrames={sch.checkpoint.dur} layout="none">
            <Checkpoint text={step.checkpoint} />
          </Sequence>
        ) : null}
      </div>

      {/* narration, one sentence at a time */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: CLIP_W, height: SUB_H, display: "flex", alignItems: "center", borderTop: `2px solid ${T.rule}` }}>
        <Subtitles text={step.narration[level]} from={sch.body.from} to={sch.total} width={CLIP_W} />
      </div>
    </AbsoluteFill>
  );
};

const Caption: FC<{ icon: ReactNode; label: string; text: string; count: string }> = ({ icon, label, text, count }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div style={{ ...box(), height: CAPTION_H - 24, marginTop: 12, display: "flex", alignItems: "center", gap: 24, padding: "0 24px", opacity: s, transform: `translateY(${(1 - s) * 24}px)` }}>
      <div style={{ background: T.action, width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 700, fontSize: 32, color: T.action }}>{label}</div>
          <div style={{ fontSize: 24, color: T.ash }}>{count}</div>
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.25, color: T.ink, marginTop: 6 }}>{text}</div>
      </div>
    </div>
  );
};

const Choices: FC<{ prompt: string; choices: { id: string; label: string }[]; def?: string | null }> = ({ prompt, choices, def }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ ...box(), height: CAPTION_H - 24, marginTop: 12, padding: "16px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 30, color: T.ink }}>{prompt}</div>
      <div style={{ display: "flex", gap: 14 }}>
        {choices.map((c, i) => {
          const s = spring({ frame: frame - i * 4, fps, config: { damping: 200 } });
          const on = c.id === def;
          return (
            <div key={c.id} style={{ flex: 1, border: `3px solid ${on ? T.action : T.ink}`, background: on ? T.action : T.paper, color: on ? T.paper : T.ink, fontSize: 26, padding: "10px 12px", textAlign: "center", opacity: s, transform: `translateY(${(1 - s) * 12}px)` }}>
              {c.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Checkpoint: FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 12, height: CAPTION_H - 24, background: T.check, color: T.paper, display: "flex", alignItems: "center", gap: 24, padding: "0 24px", transform: `translateY(${(1 - s) * 40}px)`, opacity: s }}>
      <Check size={64} strokeWidth={3} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 30 }}>Check</div>
        <div style={{ fontSize: 30, lineHeight: 1.25 }}>{text}</div>
      </div>
    </div>
  );
};
