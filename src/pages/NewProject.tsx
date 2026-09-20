import { useState, type FormEvent } from "react";
import type { StoredFile } from "../lib/projectsStore";
import { runPipeline } from "../pipeline/runPipeline";
import type { RunPipelineOutput } from "../pipeline/runPipeline";

interface Props {
  onCancel: () => void;
  onCreated: (id: string, result: RunPipelineOutput, files: StoredFile[], youtubeUrl?: string, packagingUrl?: string) => void;
}

export default function NewProject({ onCancel, onCreated }: Props) {
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [packagingUrl, setPackagingUrl] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const next: StoredFile[] = [];
    for (const file of Array.from(list)) {
      const role = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "photo";
      if (role === "photo" && !file.type.startsWith("image/")) continue;
      next.push({ name: file.name, mime: file.type || (role === "pdf" ? "application/pdf" : "image/jpeg"), role, dataUrl: await readDataUrl(file) });
    }
    setFiles((prev) => [...prev, ...next]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Name the project."); return; }
    if (!files.length) { setError("Upload a PDF and/or page photos. The manual is required."); return; }
    setBusy(true);
    try {
      const result = await runPipeline({
        name: name.trim(),
        files,
        youtubeUrl: youtubeUrl.trim() || undefined,
        packagingUrl: packagingUrl.trim() || undefined,
      });
      onCreated(result.guideId, result, files, youtubeUrl.trim() || undefined, packagingUrl.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold">New project</h1>
      <p className="mt-1 text-ash">Manual (PDF or photos) is the source of truth. Video is optional gap-fill. Chrome is a form on purpose — design comes later.</p>

      <form className="mt-6 space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="font-bold">Name</span>
          <input
            className="mt-1 w-full border border-ink bg-paper px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kids' loft bed"
            required
          />
        </label>

        <label className="block">
          <span className="font-bold">Manual — PDF and/or page photos</span>
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={(e) => void onFiles(e.target.files)}
          />
          {files.length > 0 ? (
            <ul className="mt-2 text-sm text-ash">
              {files.map((f) => (
                <li key={f.name + f.dataUrl.slice(-12)}>{f.role}: {f.name}</li>
              ))}
            </ul>
          ) : null}
        </label>

        <label className="block">
          <span className="font-bold">YouTube URL <span className="font-normal text-ash">(optional)</span></span>
          <input
            className="mt-1 w-full border border-ink bg-paper px-3 py-2"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
          />
        </label>

        <label className="block">
          <span className="font-bold">Packaging QR / URL <span className="font-normal text-ash">(optional)</span></span>
          <input
            className="mt-1 w-full border border-ink bg-paper px-3 py-2"
            value={packagingUrl}
            onChange={(e) => setPackagingUrl(e.target.value)}
            placeholder="URL printed or QRed on the box"
            inputMode="url"
          />
        </label>

        {error ? <p className="text-action" role="alert">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="border border-ink bg-ink px-4 py-2 text-paper disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            {busy ? "Running pipeline…" : "Create draft"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-ink bg-paper px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
