import { Plus } from "lucide-react";
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
  const thumbStep = golden.guide.steps.find((s) => s.figure) ?? golden.guide.steps[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader
        title="Plainstep"
        wordmark
        soft
        menu
        onProjects={onProjects}
        onNew={onNew}
        trailing={
          <button
            type="button"
            aria-label="New guide"
            onClick={onNew}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rule focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <Plus size={22} strokeWidth={2.25} />
          </button>
        }
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-1">
        <section
          data-home-hero
          aria-labelledby="home-hero-heading"
          className="overflow-hidden rounded-[28px] bg-action p-3 pt-4 text-paper"
        >
          <div className="px-2">
            <p id="home-hero-heading" className="text-[1.65rem] font-bold leading-[1.15]">
              Clear assembly videos from any manual.
            </p>
            <h2 className="mt-4 text-sm font-bold tracking-wide text-paper/90">How it works</h2>
            <ol className="mt-2 space-y-1.5">
              {HOW_IT_WORKS.map((label, i) => (
                <li key={label} className="flex items-center gap-2.5 text-[0.95rem] font-bold">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper/20 text-xs"
                  >
                    {i + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>

          <article className="mt-4 rounded-[22px] bg-desk p-4 text-chrome-ink">
            <div className="flex items-start gap-3">
              <FigureThumb guide={golden.guide} step={thumbStep} size={72} className="rounded-2xl" />
              <div className="min-w-0 pt-0.5">
                <p className="text-xs font-bold tracking-wide text-action">Sample</p>
                <h3 className="mt-0.5 text-xl font-bold leading-tight">{golden.name}</h3>
                <p className="mt-1 text-sm leading-snug text-ash">
                  {golden.guide.steps.length} steps with checkpoints. Simple words on every clip.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen(golden.id)}
              className="mt-4 w-full rounded-full bg-paper py-3.5 text-center text-base font-bold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              Try MagicH Pro Chair
            </button>
          </article>
        </section>

        <section aria-labelledby="your-guides-heading">
          <h2 id="your-guides-heading" className="px-0.5 text-lg font-bold">Your guides</h2>
          {drafts.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-rule bg-chrome px-4 py-4">
              <p className="font-bold">No guides yet</p>
              <p className="mt-1 text-sm leading-snug text-ash">
                Tap New guide to turn a PDF or page photos into clips.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {drafts.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} onOpen={onOpen} onDelete={() => onDelete(p.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="px-0.5 text-sm leading-snug text-ash">
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
        <OrangeButton className="rounded-full" onClick={onNew}>New guide</OrangeButton>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: StoredProject;
  onOpen: (id: string) => void;
  onDelete?: () => void;
}) {
  const thumbStep = project.guide.steps.find((s) => s.figure) ?? project.guide.steps[0];
  return (
    <article className="overflow-hidden rounded-2xl border border-rule bg-chrome">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="flex w-full items-center gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <FigureThumb guide={project.guide} step={thumbStep} size={64} className="rounded-xl" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold leading-tight">{project.name}</div>
          <div className="mt-0.5 text-sm text-ash">{project.guide.steps.length} steps</div>
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
