import AppHeader from "../chrome/AppHeader";
import OrangeButton from "../chrome/OrangeButton";
import InkButton from "../chrome/InkButton";
import { listConflicts, listFills, keepManual, useVideo, type ConflictItem, type FillItem } from "../lib/review";
import type { StoredProject } from "../lib/projectsStore";

interface Props {
  project: StoredProject;
  onProjects: () => void;
  onNew: () => void;
  onOpenGuide: () => void;
  onChange: (next: StoredProject) => void;
}

export default function Review({ project, onProjects, onNew, onOpenGuide, onChange }: Props) {
  const accepted = new Set(project.acceptedFills ?? []);
  const fills = listFills(project.guide).filter((f) => !accepted.has(f.key));
  const conflicts = listConflicts(project.guide);

  const accept = (item: FillItem) => {
    onChange({
      ...project,
      acceptedFills: [...accepted, item.key],
    });
  };

  const onKeepManual = (item: ConflictItem) => {
    onChange({ ...project, guide: keepManual(project.guide, item) });
  };

  const onUseVideo = (item: ConflictItem) => {
    const { guide, acceptedKey } = useVideo(project.guide, item);
    onChange({
      ...project,
      guide,
      acceptedFills: acceptedKey ? [...accepted, acceptedKey] : [...accepted],
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader title="Review" menu menuSide="right" onProjects={onProjects} onNew={onNew} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2">
        <section>
          <h2 className="mb-2 font-bold">Filled from video</h2>
          {fills.length === 0 ? (
            <p className="border border-rule px-3 py-3 text-ash">
              {listFills(project.guide).length === 0
                ? "Nothing inferred from video. The printed manual stands."
                : "All video fills accepted."}
            </p>
          ) : (
            <ul className="space-y-3">
              {fills.map((item) => (
                <li key={item.key} className="border border-rule p-3">
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink text-xs font-bold text-paper">In</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Inferred from video</p>
                      <p className="mt-1 line-clamp-2 text-sm">{item.text}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <InkButton className="!w-auto px-5 py-2 text-base" onClick={() => accept(item)}>Accept</InkButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-bold">Conflicts</h2>
          {conflicts.length === 0 ? (
            <p className="border border-rule px-3 py-3 text-ash">No manual vs video conflicts.</p>
          ) : (
            <ul className="space-y-3">
              {conflicts.map((item, i) => (
                <li key={item.key} className="border border-chrome-ink p-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-action text-sm font-bold text-paper">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Manual vs video</p>
                      {item.manualClaim ? (
                        <p className="mt-2 text-sm"><span className="font-bold">Manual: </span>{item.manualClaim}</p>
                      ) : <p className="mt-2 text-sm">{item.text}</p>}
                      {item.videoClaim ? (
                        <p className="mt-1 line-clamp-3 text-sm"><span className="font-bold">Video: </span>{item.videoClaim}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <InkButton className="py-2 text-base" onClick={() => onKeepManual(item)}>Keep manual</InkButton>
                    <InkButton className="py-2 text-base" onClick={() => onUseVideo(item)}>Use video</InkButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="bg-chrome px-4 pb-6 pt-2">
        <OrangeButton onClick={onOpenGuide}>Open guide</OrangeButton>
      </div>
    </div>
  );
}
