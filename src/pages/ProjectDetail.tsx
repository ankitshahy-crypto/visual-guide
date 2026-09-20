import { useCallback, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Guide, NarrationLevel } from "../types/guide";
import { mmss } from "../lib/timing";
import StepPlayer from "../components/StepPlayer";
import StepList from "../components/StepList";

interface Props { guide: Guide; projectName: string }

export default function ProjectDetail({ guide, projectName }: Props) {
  const [selected, setSelected] = useState(guide.steps[0].id);
  const [level, setLevel] = useState<NarrationLevel>("standard");
  const [playAll, setPlayAll] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());

  const idx = guide.steps.findIndex((s) => s.id === selected);
  const step = guide.steps[idx] ?? guide.steps[0];
  const total = useMemo(() => guide.steps.reduce((n, s) => n + s.estimated_seconds, 0), [guide]);

  const onEnded = useCallback(() => {
    // Checkpoint band is the last beat of the clip. The step is not complete until that fires.
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(step.id);
      return next;
    });
    if (!playAll) return;
    const nextStep = guide.steps[idx + 1];
    if (nextStep) setSelected(nextStep.id);
    else setPlayAll(false);
  }, [playAll, idx, guide, step.id]);

  const select = (id: string) => {
    setPlayAll(false);
    if (id === selected) setReplayKey((k) => k + 1);
    else setSelected(id);
  };

  const togglePlayAll = () => {
    if (playAll) {
      setPlayAll(false);
      return;
    }
    setReplayKey((k) => k + 1);
    setPlayAll(true);
  };

  return (
    <div className="min-h-full">
      <header className="px-4 pt-5 pb-3 md:px-8">
        <h1 className="text-2xl font-bold leading-tight">{projectName}</h1>
        <p className="text-ash">{guide.product.brand} {guide.product.model} · {guide.steps.length} steps · {mmss(total)}</p>
      </header>

      <div className="md:grid md:grid-cols-[minmax(0,480px)_1fr] md:gap-8 md:px-8">
        <div className="md:sticky md:top-4 md:self-start">
          <StepPlayer
            guide={guide}
            step={step}
            level={level}
            autoPlay={playAll}
            replayKey={replayKey}
            onEnded={onEnded}
          />

          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-0">
            <div className="flex border border-ink" role="radiogroup" aria-label="Narration">
              {(["standard", "simple"] as NarrationLevel[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={level === l}
                  onClick={() => setLevel(l)}
                  className={`px-4 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${level === l ? "bg-ink text-paper" : "bg-paper text-ink"}`}
                >
                  {l === "standard" ? "Standard" : "Simple words"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={togglePlayAll}
              className="inline-flex items-center gap-2 border border-ink bg-paper px-4 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              {playAll ? <Square size={18} /> : <Play size={18} />}
              {playAll ? "Stop" : "Play all"}
            </button>
          </div>
        </div>

        <section aria-label="Steps" className="md:pt-0">
          <StepList guide={guide} selected={selected} completed={completed} onSelect={select} />
        </section>
      </div>
    </div>
  );
}
