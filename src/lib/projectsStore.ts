import type { Guide } from "../types/guide";

export type ProjectKind = "golden" | "draft";

export interface StoredFile {
  name: string;
  mime: string;
  role: "pdf" | "photo";
  dataUrl: string;
}

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  kind: ProjectKind;
  youtubeUrl?: string;
  packagingUrl?: string;
  files: StoredFile[];
  guide: Guide;
  pipeline: { log: string[]; stubbed: string[] };
}

const DB_NAME = "visual-guide";
const STORE = "projects";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export async function listDrafts(): Promise<StoredProject[]> {
  const rows = await tx<StoredProject[]>("readonly", (s) => s.getAll());
  return (rows ?? []).filter((p) => p.kind === "draft").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDraft(id: string): Promise<StoredProject | undefined> {
  return tx<StoredProject | undefined>("readonly", (s) => s.get(id));
}

export async function saveDraft(project: StoredProject): Promise<void> {
  await tx("readwrite", (s) => s.put(project));
}

export async function deleteDraft(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export function downloadGuideJson(project: StoredProject): void {
  const blob = new Blob([JSON.stringify(project.guide, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${project.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
