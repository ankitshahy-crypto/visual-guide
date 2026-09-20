import { useCallback, useEffect, useMemo, useState } from "react";
import goldenJson from "./data/golden/newtral-magich-pro.json";
import { assertGuide } from "./lib/validate";
import { deleteDraft, getDraft, listDrafts, saveDraft, type StoredProject } from "./lib/projectsStore";
import { needsReview } from "./lib/review";
import PhoneShell from "./chrome/PhoneShell";
import ProjectList from "./pages/ProjectList";
import NewGuide from "./pages/NewGuide";
import Analyzing from "./pages/Analyzing";
import Review from "./pages/Review";
import StepListPage from "./pages/StepListPage";
import PlayerPage from "./pages/PlayerPage";
import type { RunPipelineOutput } from "./pipeline/runPipeline";
import type { StoredFile } from "./lib/projectsStore";
import type { NarrationLevel } from "./types/guide";

export const GOLDEN_ID = "newtral-magich-pro-assembly";

type Route =
  | { page: "list" }
  | { page: "new" }
  | { page: "analyzing" }
  | { page: "steps"; id: string }
  | { page: "review"; id: string }
  | { page: "player"; id: string; stepId: string };

function routeFromHash(): Route {
  const raw = location.hash.replace(/^#/, "") || "/";
  const pathOnly = raw.split("?")[0] || "/";
  const h = pathOnly.endsWith("/") && pathOnly.length > 1 ? pathOnly.slice(0, -1) : pathOnly;
  if (h === "/new") return { page: "new" };
  if (h === "/new/analyzing") return { page: "analyzing" };
  const review = /^\/p\/([^/]+)\/review$/.exec(h);
  if (review) return { page: "review", id: decodeURIComponent(review[1]) };
  const player = /^\/p\/([^/]+)\/s\/([^/]+)$/.exec(h);
  if (player) return { page: "player", id: decodeURIComponent(player[1]), stepId: decodeURIComponent(player[2]) };
  const steps = /^\/p\/([^/]+)$/.exec(h);
  if (steps) return { page: "steps", id: decodeURIComponent(steps[1]) };
  return { page: "list" };
}

function goldenProject(): StoredProject {
  const guide = assertGuide(goldenJson);
  return {
    id: GOLDEN_ID,
    name: "MagicH Pro Chair",
    createdAt: "2026-01-01T00:00:00.000Z",
    kind: "golden",
    guide,
    files: [],
    pipeline: { log: ["Golden fixture — authored against the MagicH Pro manual, not produced by the creator pipeline."], stubbed: [] },
  };
}

function projectId(route: Route): string | null {
  if (route.page === "steps" || route.page === "review" || route.page === "player") return route.id;
  return null;
}

export default function App() {
  const golden = useMemo(goldenProject, []);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [drafts, setDrafts] = useState<StoredProject[]>([]);
  const [open, setOpen] = useState<StoredProject | null>(null);
  const [missing, setMissing] = useState(false);
  const [simpleWords, setSimpleWords] = useState(false);
  const [playAll, setPlayAll] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [completedById, setCompletedById] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const refresh = useCallback(async () => {
    try { setDrafts(await listDrafts()); }
    catch { setDrafts([]); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    const id = projectId(route);
    if (!id) { setOpen(null); return; }
    if (id === GOLDEN_ID) { setOpen(golden); return; }
    void getDraft(id).then((p) => {
      if (cancelled) return;
      if (!p) { setOpen(null); setMissing(true); return; }
      setOpen(p);
    });
    return () => { cancelled = true; };
  }, [route, golden]);

  const go = (path: string) => { location.hash = path; };

  const patchOpen = async (next: StoredProject) => {
    setOpen(next);
    if (next.kind === "draft") {
      await saveDraft(next);
      await refresh();
    }
  };

  const onCreated = async (
    id: string,
    result: RunPipelineOutput,
    files: StoredFile[],
    youtubeUrl?: string,
    packagingUrl?: string,
  ) => {
    let pid = id;
    if (pid === GOLDEN_ID || await getDraft(pid)) pid = `${pid}-${Date.now().toString(36)}`;
    const project: StoredProject = {
      id: pid,
      name: result.guide.title,
      createdAt: new Date().toISOString(),
      kind: "draft",
      youtubeUrl,
      packagingUrl,
      files,
      guide: result.guide,
      pipeline: { log: result.log, stubbed: result.stubbed },
      acceptedFills: [],
    };
    await saveDraft(project);
    await refresh();
    if (needsReview(project.guide, project.acceptedFills)) go(`/p/${encodeURIComponent(pid)}/review`);
    else go(`/p/${encodeURIComponent(pid)}`);
  };

  const onDelete = async (id: string) => {
    await deleteDraft(id);
    await refresh();
  };

  const completed = useMemo(() => {
    const id = projectId(route);
    return new Set(id ? (completedById[id] ?? []) : []);
  }, [route, completedById]);

  const markComplete = (projectIdValue: string, stepId: string) => {
    setCompletedById((prev) => {
      const cur = prev[projectIdValue] ?? [];
      if (cur.includes(stepId)) return prev;
      return { ...prev, [projectIdValue]: [...cur, stepId] };
    });
  };

  const level: NarrationLevel = simpleWords ? "simple" : "standard";
  const steps = open?.guide.steps ?? [];
  const playerStep = route.page === "player" ? (steps.find((s) => s.id === route.stepId) ?? steps[0]) : undefined;
  const playerIdx = playerStep ? steps.findIndex((s) => s.id === playerStep.id) : -1;

  const onEnded = () => {
    if (!open || !playerStep) return;
    markComplete(open.id, playerStep.id);
    if (!playAll) return;
    const nextStep = steps[playerIdx + 1];
    if (nextStep) go(`/p/${encodeURIComponent(open.id)}/s/${encodeURIComponent(nextStep.id)}`);
    else {
      setPlayAll(false);
      go(`/p/${encodeURIComponent(open.id)}`);
    }
  };

  const onPlayAll = (v: boolean) => {
    setPlayAll(v);
    if (v && open && steps[0]) {
      setReplayKey((k) => k + 1);
      go(`/p/${encodeURIComponent(open.id)}/s/${encodeURIComponent(steps[0].id)}`);
    }
  };

  return (
    <PhoneShell>
      {route.page === "list" ? (
        <ProjectList
          golden={golden}
          drafts={drafts}
          onOpen={(id) => go(`/p/${encodeURIComponent(id)}`)}
          onNew={() => go("/new")}
          onDelete={onDelete}
          onProjects={() => go("/")}
        />
      ) : null}

      {route.page === "new" ? (
        <NewGuide onCancel={() => go("/")} onContinue={() => go("/new/analyzing")} />
      ) : null}

      {route.page === "analyzing" ? (
        <Analyzing onBack={() => go("/new")} onCreated={onCreated} />
      ) : null}

      {route.page === "review" && open ? (
        <Review
          key={open.id}
          project={open}
          onProjects={() => go("/")}
          onNew={() => go("/new")}
          onOpenGuide={() => go(`/p/${encodeURIComponent(open.id)}`)}
          onChange={(next) => { void patchOpen(next); }}
        />
      ) : null}

      {route.page === "steps" && open ? (
        <StepListPage
          key={open.id}
          project={open}
          simpleWords={simpleWords}
          playAll={playAll}
          completed={completed}
          onSimpleWords={setSimpleWords}
          onPlayAll={onPlayAll}
          onBack={() => go("/")}
          onOpenStep={(stepId) => go(`/p/${encodeURIComponent(open.id)}/s/${encodeURIComponent(stepId)}`)}
        />
      ) : null}

      {route.page === "player" && open && playerStep ? (
        <PlayerPage
          key={`${open.id}-${playerStep.id}`}
          guide={open.guide}
          step={playerStep}
          level={level}
          replayKey={replayKey}
          onReplay={() => setReplayKey((k) => k + 1)}
          onNext={() => {
            const nextStep = steps[playerIdx + 1];
            if (nextStep) go(`/p/${encodeURIComponent(open.id)}/s/${encodeURIComponent(nextStep.id)}`);
            else {
              setPlayAll(false);
              go(`/p/${encodeURIComponent(open.id)}`);
            }
          }}
          onBack={() => go(`/p/${encodeURIComponent(open.id)}`)}
          onEnded={onEnded}
          hasNext={playerIdx >= 0 && playerIdx < steps.length - 1}
        />
      ) : null}

      {(route.page === "steps" || route.page === "review" || route.page === "player") && missing ? (
        <p className="px-4 py-8 text-ash">
          No project with that id in this browser.{" "}
          <button type="button" className="underline" onClick={() => go("/")}>Back to projects</button>
        </p>
      ) : null}
    </PhoneShell>
  );
}
