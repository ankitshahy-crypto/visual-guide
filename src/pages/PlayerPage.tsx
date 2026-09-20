import { useEffect, useState } from "react";
import type { Guide, NarrationLevel, Step } from "../types/guide";
import StepPlayer from "../components/StepPlayer";
import OrangeButton from "../chrome/OrangeButton";
import InkButton from "../chrome/InkButton";
import { ChevronLeft } from "lucide-react";

interface Props {
  guide: Guide;
  step: Step;
  level: NarrationLevel;
  replayKey: number;
  onReplay: () => void;
  onNext: () => void;
  onBack: () => void;
  onEnded: () => void;
  hasNext: boolean;
}

export default function PlayerPage({
  guide,
  step,
  level,
  replayKey,
  onReplay,
  onNext,
  onBack,
  onEnded,
  hasNext,
}: Props) {
  const [choiceOpen, setChoiceOpen] = useState(Boolean(step.options));

  useEffect(() => {
    setChoiceOpen(Boolean(step.options));
  }, [step.id]);

  const play = !choiceOpen;
  const defLabel = step.options?.choices.find((c) => c.id === step.options?.default)?.label;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center px-2 pt-2">
        <button
          type="button"
          aria-label="Back to steps"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <ChevronLeft size={28} strokeWidth={2.25} />
        </button>
      </div>

      <div className="relative flex-1">
        <StepPlayer
          guide={guide}
          step={step}
          level={level}
          autoPlay={play}
          replayKey={replayKey}
          onEnded={onEnded}
          controls={false}
        />
        {choiceOpen && step.options ? (
          <div className="absolute inset-0 z-10 flex flex-col justify-end bg-paper/95 p-4">
            <div className="border border-ink bg-paper p-4">
              <p className="text-lg font-bold">{step.options.prompt}</p>
              <ul className="mt-3 space-y-2">
                {step.options.choices.map((c) => {
                  const on = c.id === step.options?.default;
                  return (
                    <li
                      key={c.id}
                      className={`border px-3 py-2 ${on ? "border-action bg-action text-paper" : "border-ink"}`}
                    >
                      {c.label}
                      {on ? " — start with this" : ""}
                    </li>
                  );
                })}
              </ul>
              {defLabel ? <p className="mt-3 text-sm text-ash">Start with {defLabel}. The printed options stand.</p> : null}
              <OrangeButton className="mt-4" onClick={() => setChoiceOpen(false)}>Continue</OrangeButton>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <InkButton onClick={onReplay}>Replay</InkButton>
        <OrangeButton variant="outline" onClick={onNext}>{hasNext ? "Next" : "Done"}</OrangeButton>
      </div>
    </div>
  );
}
