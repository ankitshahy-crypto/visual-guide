import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import AppHeader from "../chrome/AppHeader";
import OrangeButton from "../chrome/OrangeButton";
import { loadRecordedFixtureFiles, recordedFixturePending } from "../lib/fixtureCreate";
import { setPendingCreate } from "../lib/pendingCreate";
import type { StoredFile } from "../lib/projectsStore";
import {
  liveUploadBlocked,
  looksLikeStaticHost,
  pipelineAvailable,
} from "../lib/staticHost";

interface Props {
  onCancel: () => void;
  onContinue: () => void;
  autoFixture?: boolean;
}

export default function NewGuide({ onCancel, onContinue, autoFixture }: Props) {
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [packagingUrl, setPackagingUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [skippedVideo, setSkippedVideo] = useState(false);
  const [pdfs, setPdfs] = useState<StoredFile[]>([]);
  const [photos, setPhotos] = useState<StoredFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [staticHost, setStaticHost] = useState(() => looksLikeStaticHost());
  const [fixtureBusy, setFixtureBusy] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const onContinueRef = useRef(onContinue);
  const startedAuto = useRef(false);
  onContinueRef.current = onContinue;

  useEffect(() => {
    let cancelled = false;
    if (looksLikeStaticHost()) {
      setStaticHost(true);
      return;
    }
    void pipelineAvailable().then((ok) => {
      if (!cancelled) setStaticHost(!ok);
    });
    return () => { cancelled = true; };
  }, []);

  const startFixture = async () => {
    if (fixtureBusy) return;
    setError(null);
    setFixtureBusy(true);
    try {
      const files = await loadRecordedFixtureFiles();
      setPendingCreate(recordedFixturePending(files, name));
      onContinueRef.current();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setFixtureBusy(false);
    }
  };

  useEffect(() => {
    if (!autoFixture || startedAuto.current) return;
    startedAuto.current = true;
    void startFixture();
  }, [autoFixture]);

  const onPdf = async (e: ChangeEvent<HTMLInputElement>) => {
    const next = await readFiles(e.target.files, "pdf");
    if (next.length) setPdfs((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const onPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const next = await readFiles(e.target.files, "photo");
    if (next.length) setPhotos((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const skipVideo = () => {
    setYoutubeUrl("");
    setPackagingUrl("");
    setShowQr(false);
    setSkippedVideo(true);
  };

  const continueCreate = () => {
    void (async () => {
      setError(null);
      const files = [...pdfs, ...photos];
      if (!name.trim()) { setError("Name the project."); return; }
      if (!files.length) { setError("Add a PDF or page photos. The manual is required."); return; }
      const available = looksLikeStaticHost() ? false : await pipelineAvailable();
      const blocked = liveUploadBlocked({ fixture: false, pipelineAvailable: available });
      if (blocked) {
        setStaticHost(true);
        setError(blocked);
        return;
      }
      setPendingCreate({
        name: name.trim(),
        files,
        youtubeUrl: skippedVideo ? undefined : (youtubeUrl.trim() || undefined),
        packagingUrl: skippedVideo ? undefined : (packagingUrl.trim() || undefined),
      });
      onContinue();
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader title="New guide" back={onCancel} align="center" />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4 pt-2">
        {staticHost ? (
          <section data-static-preview-banner className="border border-action px-3 py-3">
            <p className="text-sm leading-snug">
              This build has no live pipeline API. Creator path: recorded fixture pages only.
            </p>
            <OrangeButton
              className="mt-3"
              onClick={() => void startFixture()}
              disabled={fixtureBusy}
            >
              {fixtureBusy ? "Loading fixture pages…" : "Use fixture pages (no API key)"}
            </OrangeButton>
          </section>
        ) : null}

        <label className="block">
          <span className="font-bold">Project name:</span>
          <input
            className="mt-1 w-full border border-rule bg-chrome px-3 py-2 text-chrome-ink placeholder:text-ash focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            required
          />
        </label>

        <section>
          <h2 className="font-bold">Manual (required)</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <UploadTile
              label="PDF"
              files={pdfs}
              onClick={() => pdfRef.current?.click()}
              onClear={() => setPdfs([])}
            />
            <UploadTile
              label="Page photos"
              files={photos}
              onClick={() => photoRef.current?.click()}
              onClear={() => setPhotos([])}
            />
          </div>
          <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void onPdf(e)} />
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" multiple className="hidden" onChange={(e) => void onPhotos(e)} />
        </section>

        <section>
          <h2 className="font-bold">Video (optional)</h2>
          {skippedVideo ? (
            <p className="mt-2 text-ash">Skipped. The printed manual is the source of truth.</p>
          ) : (
            <div className="mt-2 space-y-3">
              <input
                className="w-full border border-rule bg-chrome px-3 py-2 text-chrome-ink placeholder:text-ash focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="YouTube URL"
                inputMode="url"
              />
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="w-full border border-rule bg-chrome px-3 py-2.5 text-chrome-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                Scan packaging QR
              </button>
              {showQr ? (
                <label className="block">
                  <span className="text-sm text-ash">Camera scan is not in this build (iOS camera permission is declared for a later scanner). Paste the URL from the box QR:</span>
                  <input
                    className="mt-1 w-full border border-rule bg-chrome px-3 py-2 text-chrome-ink placeholder:text-ash focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
                    value={packagingUrl}
                    onChange={(e) => setPackagingUrl(e.target.value)}
                    placeholder="https://…"
                    inputMode="url"
                    autoFocus
                  />
                </label>
              ) : null}
              <div className="text-center">
                <button type="button" className="text-ash underline-offset-2 hover:underline" onClick={skipVideo}>
                  Skip
                </button>
              </div>
            </div>
          )}
        </section>

        {!staticHost ? (
          <button
            type="button"
            className="text-ash underline-offset-2 hover:underline"
            onClick={() => void startFixture()}
            disabled={fixtureBusy}
          >
            Use fixture pages (no API key)
          </button>
        ) : null}

        {error ? <p className="text-action" role="alert">{error}</p> : null}
        {autoFixture && fixtureBusy && !error ? (
          <p className="text-ash" aria-live="polite">Loading fixture pages…</p>
        ) : null}
      </div>

      <div className="bg-chrome px-4 pb-2 pt-2">
        <OrangeButton onClick={continueCreate} disabled={fixtureBusy}>Continue</OrangeButton>
      </div>
    </div>
  );
}

function UploadTile({
  label,
  files,
  onClick,
  onClear,
}: {
  label: string;
  files: StoredFile[];
  onClick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="border border-dashed border-rule">
      <button
        type="button"
        onClick={onClick}
        className="flex aspect-square w-full flex-col items-center justify-center gap-2 px-2 py-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Upload size={28} strokeWidth={2} />
        <span className="font-bold">{label}</span>
        {files.length > 0 ? (
          <span className="line-clamp-2 text-sm text-ash">{files.map((f) => f.name).join(", ")}</span>
        ) : null}
      </button>
      {files.length > 0 ? (
        <button type="button" className="w-full border-t border-dashed border-rule py-1 text-sm text-ash" onClick={onClear}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

async function readFiles(list: FileList | null, role: "pdf" | "photo"): Promise<StoredFile[]> {
  if (!list?.length) return [];
  const next: StoredFile[] = [];
  for (const file of Array.from(list)) {
    if (role === "pdf") {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) continue;
    } else {
      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
      if (!isImage) continue;
    }
    next.push({
      name: file.name,
      mime: file.type || (role === "pdf" ? "application/pdf" : "image/jpeg"),
      role,
      dataUrl: await readDataUrl(file),
    });
  }
  return next;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
