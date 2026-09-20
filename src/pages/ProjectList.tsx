import { Flag } from "lucide-react";
import type { StoredProject } from "../lib/projectsStore";
import { mmss } from "../lib/timing";
import { hasConflict } from "../types/guide";

interface Props {
  golden: StoredProject;
  drafts: StoredProject[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function ProjectList({ golden, drafts, onOpen, onNew, onDelete }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-ash">Any instruction set. The chair is the sample fixture.</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="border border-ink bg-ink px-4 py-2 text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          New project
        </button>
      </header>

      <section className="mb-8" aria-label="Sample">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ash">Golden sample</h2>
        <ProjectRow project={golden} badge="sample" onOpen={onOpen} />
      </section>

      <section aria-label="Drafts">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ash">Drafts in this browser</h2>
        {drafts.length === 0 ? (
          <p className="border border-rule bg-paper px-4 py-6 text-ash">No drafts yet. New project stores uploads and a draft guide locally (IndexedDB).</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule bg-paper">
            {drafts.map((p) => (
              <li key={p.id} className="flex items-stretch">
                <div className="min-w-0 flex-1">
                  <ProjectRow project={p} badge="draft" onOpen={onOpen} />
                </div>
                <button
                  type="button"
                  className="shrink-0 px-4 text-ash hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectRow({ project, badge, onOpen }: { project: StoredProject; badge: string; onOpen: (id: string) => void }) {
  const seconds = project.guide.steps.reduce((n, s) => n + s.estimated_seconds, 0);
  const flagged = project.guide.steps.filter((s) => s.review_notes.length > 0).length;
  const conflicts = project.guide.steps.some((s) => hasConflict(s.review_notes));
  const video = project.guide.source.video;
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="flex w-full items-center gap-4 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg leading-tight">{project.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ash">
          <span>{badge}</span>
          <span>{project.guide.steps.length} steps · {mmss(seconds)}</span>
          {video ? <span>manual + video</span> : <span>manual</span>}
          {flagged > 0 ? (
            <span className="inline-flex items-center gap-1 text-action">
              <Flag size={14} /> {conflicts ? "conflict" : "review"} · {flagged}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
