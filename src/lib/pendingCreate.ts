import type { StoredFile } from "./projectsStore";

export interface PendingCreate {
  name: string;
  files: StoredFile[];
  youtubeUrl?: string;
  packagingUrl?: string;
  /** Recorded fixture pages + vgfixture001 — runs offline (no `/api/pipeline`). */
  fixture?: boolean;
}

let pending: PendingCreate | null = null;

export function setPendingCreate(next: PendingCreate): void {
  pending = next;
}

export function getPendingCreate(): PendingCreate | null {
  return pending;
}

export function clearPendingCreate(): void {
  pending = null;
}
