import { useCallback, useEffect, useMemo, useState } from "react";
import goldenJson from "./data/golden/newtral-magich-pro.json";
import { assertGuide } from "./lib/validate";
import { deleteDraft, downloadGuideJson, getDraft, listDrafts, saveDraft, type StoredProject } from "./lib/projectsStore";
import ProjectList from "./pages/ProjectList";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import type { RunPipelineOutput } from "./pipeline/runPipeline";
import type { StoredFile } from "./lib/projectsStore";

export const GOLDEN_ID = "newtral-magich-pro-assembly";

type Route = { page: "list" } | { page: "new" } | { page: "player"; id: string };

function routeFromHash(): Route {
  const raw = location.hash.replace(/^#/, "") || "/";
  const h = raw.endsWith("/") && raw.length > 1 ? raw.slice(0, -1) : raw;
  if (h === "/new") return { page: "new" };
  const m = /^\/p\/([^/]+)$/.exec(h);
  if (m) return { page: "player", id: decodeURIComponent(m[1]) };
  return { page: "list" };
}

function goldenProject(): StoredProject {
  const guide = assertGuide(goldenJson);
  return {
    id: GOLDEN_ID,
    name: "Office chair",
    createdAt: "2026-01-01T00:00:00.000Z",
    kind: "golden",
    guide,
    files: [],
    pipeline: { log: ["Golden fixture — authored against the MagicH Pro manual, not produced by the creator pipeline."], stubbed: [] },
  };
}

export default function App() {
  const golden = useMemo(goldenProject, []);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [drafts, setDrafts] = useState<StoredProject[]>([]);
  const [open, setOpen] = useState<StoredProject | null>(null);
  const [missing, setMissing] = useState(false);

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
    if (route.page !== "player") { setOpen(null); return; }
    if (route.id === GOLDEN_ID) { setOpen(golden); return; }
    void getDraft(route.id).then((p) => {
      if (cancelled) return;
      if (!p) { setOpen(null); setMissing(true); return; }
      setOpen(p);
    });
    return () => { cancelled = true; };
  }, [route, golden]);

  const go = (path: string) => { location.hash = path; };

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
    };
    await saveDraft(project);
    await refresh();
    go(`/p/${encodeURIComponent(pid)}`);
  };

  const onDelete = async (id: string) => {
    await deleteDraft(id);
    await refresh();
  };

  return (
    <div className="min-h-full">
      <nav className="flex items-center gap-4 border-b border-rule bg-paper px-4 py-2 text-sm md:px-8">
        <span className="font-bold">Visual Guide</span>
        <button type="button" className="underline-offset-2 hover:underline" onClick={() => go("/")}>Projects</button>
        <button type="button" className="underline-offset-2 hover:underline" onClick={() => go("/new")}>New</button>
      </nav>

      {route.page === "list" ? (
        <ProjectList golden={golden} drafts={drafts} onOpen={(id) => go(`/p/${encodeURIComponent(id)}`)} onNew={() => go("/new")} onDelete={onDelete} />
      ) : null}

      {route.page === "new" ? (
        <NewProject onCancel={() => go("/")} onCreated={onCreated} />
      ) : null}

      {route.page === "player" && open ? (
        <ProjectDetail
          key={open.id}
          project={open}
          onBack={() => go("/")}
          onDownload={open.kind === "draft" ? () => downloadGuideJson(open) : undefined}
        />
      ) : null}

      {route.page === "player" && missing ? (
        <p className="px-4 py-8 text-ash md:px-8">No project with that id in this browser. <button type="button" className="underline" onClick={() => go("/")}>Back to projects</button></p>
      ) : null}
    </div>
  );
}
