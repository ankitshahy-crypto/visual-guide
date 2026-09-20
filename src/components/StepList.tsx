import { Check } from "lucide-react";
import type { Guide, Step } from "../types/guide";
import { hasConflict } from "../types/guide";
import { mmss } from "../lib/timing";
import FigureThumb from "./FigureThumb";

interface Props {
  guide: Guide;
  completed: ReadonlySet<string>;
  onSelect: (id: string) => void;
}

function defaultChoiceLabel(step: Step): string | null {
  if (!step.options?.default) return null;
  return step.options.choices.find((c) => c.id === step.options!.default)?.label ?? step.options.default;
}

export default function StepList({ guide, completed, onSelect }: Props) {
  return (
    <ol>
      {guide.steps.map((step) => {
        const done = completed.has(step.id);
        const flagged = step.review_notes.length > 0;
        const startWith = defaultChoiceLabel(step);
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className="flex w-full items-start gap-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              <FigureThumb guide={guide} step={step} size={72} />
              <div className="flex min-w-0 flex-1 items-start gap-2 pt-0.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink text-sm font-bold text-paper">
                  {step.index === 0 ? "•" : step.index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-lg font-bold leading-tight">{step.title}</div>
                    {flagged ? (
                      <span className="shrink-0 bg-action px-2 py-0.5 text-sm font-bold text-paper">
                        {hasConflict(step.review_notes) ? "Conflict" : "Review"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ash">
                    <span>{mmss(step.estimated_seconds)}</span>
                    {startWith ? <span>start with {startWith}</span> : null}
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-check">
                        <Check size={14} strokeWidth={3} /> checked
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
