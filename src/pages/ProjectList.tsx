import { PlusSquare } from "lucide-react";
import type { StoredProject } from "../lib/projectsStore";
import { LEGAL_OWNER, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";
import AppHeader from "../chrome/AppHeader";
import OrangeButton from "../chrome/OrangeButton";
import FigureThumb from "../components/FigureThumb";

const HOW_IT_WORKS = [
  "Upload manual",
  "Review AI steps",
  "Follow clips with checkpoints",
] as const;

interface Props {
  golden: StoredProject;
  drafts: StoredProject[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onProjects: () => void;
}

export default function ProjectList({ golden, drafts, onOpen, onNew, onDelete, onProjects }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader
        title="Plainstep"
        subtitle="Clear assembly videos from any manual."
        wordmark
        menu
        onProjects={onProjects}
        onNew={onNew}
        trailing={
          <button
            type="button"
            aria-label="New guide"
            onClick={onNew}
            className="flex h-10 w-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <PlusSquare size={26} strokeWidth={2} />
          </button>
        }
      />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4 pt-2">
        <section aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className="text-lg font-bold">How it works</h2>
          <ol className="mt-2 space-y-2">
            {HOW_IT_WORKS.map((label, i) => (
              <li key={label} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center border border-action text-sm font-bold text-action"
                >
                  {i + 1}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm leading-snug text-ash">
            Simple words: shorter captions on every clip when you need them.
          </p>
        </section>

        <section aria-labelledby="try-sample-heading">
          <h2 id="try-sample-heading" className="text-lg font-bold">Try a sample</h2>
          <p className="mt-1 text-sm leading-snug text-ash">
            Open the MagicH Pro Chair to see a finished guide — clips, checkpoints, and Simple words.
          </p>
          <div className="mt-3">
            <ProjectCard
              project={golden}
              onOpen={onOpen}
              badge="Sample"
              hint={`Demo · ${golden.guide.steps.length} steps`}
            />
          </div>
        </section>

        <section aria-labelledby="your-guides-heading">
          <h2 id="your-guides-heading" className="text-lg font-bold">Your guides</h2>
          {drafts.length === 0 ? (
            <p className="mt-2 text-base leading-snug text-ash">
              No guides yet. Tap New guide to turn a PDF or page photos into clips.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {drafts.map((p) => (
                <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={() => onDelete(p.id)} />
              ))}
            </div>
          )}
        </section>

        <p className="text-sm leading-snug text-ash">
          Help & support{" "}
          <a
            href={SUPPORT_MAILTO}
            className="text-chrome-ink underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            {SUPPORT_EMAIL}
          </a>
          <span className="mt-0.5 block">{LEGAL_OWNER}</span>
        </p>
      </div>

      <div className="bg-chrome px-4 pb-6 pt-2">
        <OrangeButton onClick={onNew}>New guide</OrangeButton>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  badge,
  hint,
}: {
  project: StoredProject;
  onOpen: (id: string) => void;
  onDelete?: () => void;
  badge?: string;
  hint?: string;
}) {
  const thumbStep = project.guide.steps.find((s) => s.figure) ?? project.guide.steps[0];
  return (
    <article className="border border-rule bg-chrome">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="flex w-full items-start gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <FigureThumb guide={project.guide} step={thumbStep} size={88} />
        <div className="min-w-0 pt-1">
          {badge ? (
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-action">{badge}</div>
          ) : null}
          <div className="truncate text-lg font-bold leading-tight">{project.name}</div>
          <div className="mt-1 text-base text-ash">{hint ?? `${project.guide.steps.length} steps`}</div>
        </div>
      </button>
      {onDelete ? (
        <div className="flex justify-end border-t border-rule px-3 py-1.5">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-ash hover:text-chrome-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Remove
          </button>
        </div>
      ) : null}
    </article>
  );
}
