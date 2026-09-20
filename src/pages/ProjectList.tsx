import { PlusSquare } from "lucide-react";
import type { StoredProject } from "../lib/projectsStore";
import AppHeader from "../chrome/AppHeader";
import OrangeButton from "../chrome/OrangeButton";
import FigureThumb from "../components/FigureThumb";

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
    <div className="flex min-h-full flex-col">
      <AppHeader
        title="Projects"
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

      <div className="flex-1 space-y-4 px-4 pb-4 pt-2">
        <ProjectCard project={golden} onOpen={onOpen} />
        {drafts.map((p) => (
          <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={() => onDelete(p.id)} />
        ))}
      </div>

      <div className="px-4 pb-6 pt-2">
        <OrangeButton onClick={onNew}>New guide</OrangeButton>
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
    <article className="border border-ink bg-paper">
      <button
        type="button"
        onClick={() => onOpen(project.id)}
        className="flex w-full items-start gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <FigureThumb guide={project.guide} step={thumbStep} size={88} />
        <div className="min-w-0 pt-1">
          <div className="truncate text-lg font-bold leading-tight">{project.name}</div>
          <div className="mt-1 text-base text-ash">{project.guide.steps.length} steps</div>
        </div>
      </button>
      {onDelete ? (
        <div className="flex justify-end border-t border-rule px-3 py-1.5">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-ash hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Remove
          </button>
        </div>
      ) : null}
    </article>
  );
}
