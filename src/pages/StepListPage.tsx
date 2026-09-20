import AppHeader from "../chrome/AppHeader";
import Toggle from "../chrome/Toggle";
import StepList from "../components/StepList";
import type { StoredProject } from "../lib/projectsStore";

interface Props {
  project: StoredProject;
  simpleWords: boolean;
  playAll: boolean;
  completed: ReadonlySet<string>;
  onSimpleWords: (v: boolean) => void;
  onPlayAll: (v: boolean) => void;
  onBack: () => void;
  onOpenStep: (stepId: string) => void;
}

export default function StepListPage({
  project,
  simpleWords,
  playAll,
  completed,
  onSimpleWords,
  onPlayAll,
  onBack,
  onOpenStep,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader title={project.name} back={onBack} align="center" />
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <Toggle on={simpleWords} onChange={onSimpleWords} label="Simple words" />
        <Toggle on={playAll} onChange={onPlayAll} label="Play all" accent />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <StepList guide={project.guide} completed={completed} onSelect={onOpenStep} />
      </div>
    </div>
  );
}
