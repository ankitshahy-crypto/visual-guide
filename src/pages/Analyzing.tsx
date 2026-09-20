import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import AppHeader from "../chrome/AppHeader";
import { clearPendingCreate, getPendingCreate } from "../lib/pendingCreate";
import { sleep } from "../lib/sleep";
import { runPipeline, type PipelineStage } from "../pipeline/runPipeline";
import type { RunPipelineOutput } from "../pipeline/runPipeline";
import type { StoredFile } from "../lib/projectsStore";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "parse", label: "Reading manual" },
  { id: "video", label: "Watching video" },
  { id: "merge", label: "Merging steps" },
  { id: "conflicts", label: "Checking conflicts" },
];

const COPY: Record<PipelineStage, { withVideo: string; noVideo: string }> = {
  parse: { withVideo: "Reading the printed pages…", noVideo: "Reading the printed pages…" },
  video: { withVideo: "Filling gaps from manufacturer video…", noVideo: "No video — skipping." },
  merge: { withVideo: "Keeping the manual; filling gaps from video…", noVideo: "Building steps from the manual…" },
  conflicts: { withVideo: "Flagging disagreements — the printed page stands.", noVideo: "Checking the draft against the schema…" },
};

interface Props {
  onBack: () => void;
  onCreated: (id: string, result: RunPipelineOutput, files: StoredFile[], youtubeUrl?: string, packagingUrl?: string) => void;
}

let analyzeSeq = 0;

export default function Analyzing({ onBack, onCreated }: Props) {
  const [current, setCurrent] = useState<PipelineStage>("parse");
  const [done, setDone] = useState<Set<PipelineStage>>(new Set());
  const [skippedVideo, setSkippedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onCreatedRef = useRef(onCreated);
  const onBackRef = useRef(onBack);
  onCreatedRef.current = onCreated;
  onBackRef.current = onBack;

  useEffect(() => {
    const seq = ++analyzeSeq;
    let cancelled = false;
    const pending = getPendingCreate();
    if (!pending) {
      onBackRef.current();
      return;
    }
    const hasVideo = Boolean(pending.youtubeUrl || pending.packagingUrl);
    setSkippedVideo(!hasVideo);

    void (async () => {
      try {
        const result = await runPipeline(
          {
            name: pending.name,
            files: pending.files,
            youtubeUrl: pending.youtubeUrl,
            packagingUrl: pending.packagingUrl,
          },
          {
            onStage: async (stage) => {
              if (cancelled || seq !== analyzeSeq) return;
              setCurrent(stage);
              setDone((prev) => {
                const next = new Set(prev);
                const idx = STAGES.findIndex((s) => s.id === stage);
                STAGES.slice(0, idx).forEach((s) => next.add(s.id));
                return next;
              });
              await sleep(stage === "video" && !hasVideo ? 350 : 600);
            },
          },
        );
        if (cancelled || seq !== analyzeSeq) return;
        setDone(new Set(STAGES.map((s) => s.id)));
        await sleep(280);
        if (cancelled || seq !== analyzeSeq) return;
        clearPendingCreate();
        onCreatedRef.current(result.guideId, result, pending.files, pending.youtubeUrl, pending.packagingUrl);
      } catch (err) {
        if (cancelled || seq !== analyzeSeq) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const status = COPY[current][skippedVideo ? "noVideo" : "withVideo"];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader title="Analyzing" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <ul className="space-y-3">
          {STAGES.map((s) => {
            const isDone = done.has(s.id);
            const isCurrent = s.id === current && !isDone && !error;
            const videoSkip = s.id === "video" && skippedVideo && (isDone || isCurrent);
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 border px-3 py-3 ${isCurrent ? "border-ink" : "border-transparent"}`}
              >
                <StageMark done={isDone} current={isCurrent} />
                <div className="min-w-0 flex-1 text-lg">
                  {s.label}
                  {isDone && s.id === "parse" ? " (done)" : null}
                  {videoSkip && isDone ? " (skipped)" : null}
                </div>
                {isCurrent ? <LoaderCircle size={22} className="shrink-0 animate-spin text-action" /> : null}
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="mt-6 text-action" role="alert">{error}</p>
        ) : (
          <p className="mt-8 text-ash" aria-live="polite">{status}</p>
        )}
        {error ? (
          <button type="button" className="mt-4 underline" onClick={onBack}>Back to New guide</button>
        ) : null}
      </div>
    </div>
  );
}

function StageMark({ done, current }: { done: boolean; current: boolean }) {
  if (current) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-action text-action">
        <Check size={18} strokeWidth={3} />
      </span>
    );
  }
  if (done) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink text-ink">
        <Check size={18} strokeWidth={3} />
      </span>
    );
  }
  return <span className="h-7 w-7 shrink-0 border-2 border-ink" />;
}
