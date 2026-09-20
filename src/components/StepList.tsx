import { Check, Flag } from "lucide-react";
import type { Guide, Step } from "../types/guide";
import { pageByKey } from "../types/guide";
import { asBBox, computeCrop } from "../lib/crop";
import { pageImageUrl } from "../lib/pageImage";
import { mmss } from "../lib/timing";

interface Props {
  guide: Guide;
  selected: string;
  completed: ReadonlySet<string>;
  onSelect: (id: string) => void;
}

const THUMB = 72;

function Thumb({ guide, step }: { guide: Guide; step: Step }) {
  const page = step.figure ? pageByKey(guide, step.figure.page) : undefined;
  if (!step.figure || !page) return <div className="bg-paper border border-rule" style={{ width: THUMB, height: THUMB }} />;
  const aspect = page.width && page.height ? page.width / page.height : 0.7;
  const c = computeCrop({ w: THUMB, h: THUMB, bbox: asBBox(step.figure.bbox), aspect });
  return (
    <div className="relative overflow-hidden bg-paper border border-rule" style={{ width: THUMB, height: THUMB }}>
      <img
        src={pageImageUrl(page.image)}
        alt=""
        className="absolute max-w-none"
        style={{ width: c.pageW, height: c.pageH, left: c.left, top: c.top }}
      />
    </div>
  );
}

function defaultChoiceLabel(step: Step): string | null {
  if (!step.options?.default) return null;
  return step.options.choices.find((c) => c.id === step.options!.default)?.label ?? step.options.default;
}

export default function StepList({ guide, selected, completed, onSelect }: Props) {
  return (
    <ol className="divide-y divide-rule border-y border-rule bg-paper">
      {guide.steps.map((step) => {
        const on = step.id === selected;
        const done = completed.has(step.id);
        const startWith = defaultChoiceLabel(step);
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={on ? "step" : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${on ? "border-l-8 border-action pl-2" : "border-l-8 border-transparent pl-2"}`}
            >
              <div className="w-8 shrink-0 text-lg font-bold tabular-nums">{step.index === 0 ? "•" : step.index}</div>
              <Thumb guide={guide} step={step} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg leading-tight">{step.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ash">
                  <span>{mmss(step.estimated_seconds)}</span>
                  {step.parts_used.length > 0 ? <span>{step.parts_used.map((p) => p.id).join(" ")}</span> : null}
                  {startWith ? <span>start with {startWith}</span> : null}
                  {step.review_notes.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-action" title={step.review_notes.join(" ")}>
                      <Flag size={14} /> review
                    </span>
                  ) : null}
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-check" title="Checkpoint reached">
                      <Check size={14} strokeWidth={3} /> checked
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
