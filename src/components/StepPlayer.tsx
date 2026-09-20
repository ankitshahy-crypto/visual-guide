import { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { Guide, NarrationLevel, Step } from "../types/guide";
import { CLIP_H, CLIP_W, FPS, clipFrames, schedule } from "../lib/timing";
import { cueAt } from "../lib/sentences";
import { ensureStepAudio } from "../lib/ensureStepAudio";
import { planNarration, resolveLinesFromIndex, type NarrationMode, type ResolvedAudioLine } from "../lib/narrationAudio";
import { StepClip } from "../remotion/StepClip";

interface Props {
  guide: Guide;
  step: Step;
  level: NarrationLevel;
  autoPlay: boolean;
  replayKey: number;
  onEnded: () => void;
  onNarrationMode?: (mode: NarrationMode) => void;
  controls?: boolean;
}

/** The same StepClip the renderer uses, played live in the browser. */
export default function StepPlayer({
  guide,
  step,
  level,
  autoPlay,
  replayKey,
  onEnded,
  onNarrationMode,
  controls = false,
}: Props) {
  const ref = useRef<PlayerRef>(null);
  const text = step.narration[level];
  const bundled = resolveLinesFromIndex(text);
  const [audio, setAudio] = useState<ResolvedAudioLine[] | null>(bundled);
  const [mode, setMode] = useState<NarrationMode | null>(bundled ? "files" : null);

  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    p.addEventListener("ended", onEnded);
    return () => p.removeEventListener("ended", onEnded);
  }, [onEnded, step.id, replayKey]);

  useEffect(() => {
    if (autoPlay) ref.current?.play();
  }, [autoPlay, step.id, replayKey]);

  useEffect(() => {
    let cancelled = false;
    const bundledNow = resolveLinesFromIndex(step.narration[level]);
    if (bundledNow) {
      setAudio(bundledNow);
      setMode("files");
      onNarrationMode?.("files");
      return;
    }
    setAudio(null);
    setMode(null);
    void ensureStepAudio(step, level).then((result) => {
      if (cancelled) return;
      setAudio(result.lines);
      setMode(result.status);
      onNarrationMode?.(result.status);
    });
    return () => { cancelled = true; };
  }, [step.id, level, text, onNarrationMode, step]);

  useEffect(() => {
    if (mode !== "live") return;
    const p = ref.current;
    if (!p) return;
    const sch = schedule(step);
    const { cues } = planNarration(text, sch.body.from, sch.total, audio);
    let raf = 0;
    let lastKey = "";

    const stop = () => {
      cancelAnimationFrame(raf);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      lastKey = "";
    };

    const tick = () => {
      if (!p.isPlaying()) {
        if (lastKey && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          lastKey = "";
        }
        return;
      }
      const cue = cueAt(cues, p.getCurrentFrame());
      const key = cue ? `${cue.from}:${cue.text}` : "";
      if (key && key !== lastKey && cue) {
        lastKey = key;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(cue.text);
        u.rate = level === "simple" ? 0.95 : 1;
        window.speechSynthesis.speak(u);
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    p.addEventListener("play", start);
    p.addEventListener("pause", stop);
    p.addEventListener("ended", stop);
    if (p.isPlaying()) start();

    return () => {
      p.removeEventListener("play", start);
      p.removeEventListener("pause", stop);
      p.removeEventListener("ended", stop);
      stop();
    };
  }, [mode, audio, level, replayKey, step, text]);

  return (
    <div className="w-full bg-paper" style={{ aspectRatio: `${CLIP_W} / ${CLIP_H}` }}>
      <Player
        key={`${step.id}-${level}-${replayKey}`}
        ref={ref}
        component={StepClip}
        inputProps={{ step, guide, level, audio }}
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
