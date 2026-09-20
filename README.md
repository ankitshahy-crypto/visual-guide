# Visual Guide

Visual Guide turns **any** instruction set — furniture, toys, electronics, not chairs only — into clear, numbered clips. An assembler opens a project, taps a step, and watches a short video that uses the manual's own drawings and lettered part tags.

The product destination is an **iOS App Store** app. This repo is the clip engine, data contract, and creator pipeline. **Marketing site and brand campaign come later.** Chrome here is the approved assembler/creator screen map (mobile-first, paper white).

The **Newtral MagicH Pro office chair is a golden test fixture**, not the product.

One step == one clip. The same React component (`src/remotion/StepClip.tsx`) plays live in the browser via `@remotion/player` and renders to MP4 via the Remotion CLI.

## How to run

```bash
npm install
npm run dev            # http://localhost:5173 — projects list; open the chair sample
npm test               # pipeline + golden chair fixture
npm run test:pipeline  # same tests (merge, parse, video, review)
pip install -r requirements.txt
npm run validate       # pydantic check on both golden JSON copies

npm run studio         # Remotion Studio: scrub any golden clip
npm run render -- clip-s1 out/s1.mp4
npm run render:all
```

All `remotion` / `@remotion/*` packages are pinned to the same exact version in `package.json`.

## Screen map (this PR)

Phone-width column on a desk-gray field. Paper white, black line art, square corners, one orange accent (`#f0552b`) for primary / do-this-now. Letter tags are black squares. Green (`#1e8e5a`) is the checkpoint band. Orange badge = review / conflict.

**Assembler**

| Hash | Screen | What it does |
| --- | --- | --- |
| `#/` | Projects | List (golden chair + local drafts) and **New guide** |
| `#/p/:id` | Step list | Simple words + Play all; cropped thumbs; numbered rows; orange Review badge |
| `#/p/:id/s/:stepId` | Clip player | Number/title, letter chips, figure, caption, green checkpoint (inside the clip); Replay / Next. Choice overlay when the step has options. |

**Creator**

| Hash | Screen | What it does |
| --- | --- | --- |
| `#/new` | New guide | Name; **Manual (required)** PDF + page photos; **Video (optional)** YouTube URL, Scan packaging QR (URL paste until camera exists), Skip; Continue |
| `#/new/analyzing` | Analyzing | Checklist in order: Reading manual → Watching video → Merging steps → Checking conflicts |
| `#/p/:id/review` | Review | Filled from video (Accept) + Conflicts (Keep manual / Use video) → **Open guide** (then step list / player for that draft) |

Scan packaging QR is labeled as a URL paste in this web build. Same field as a camera scan would fill.

## Assembler

Open a project (start with the chair sample):

1. Numbered step list. Each row has a thumbnail cropped from the manual drawing and a short duration.
2. Tap a step: black number box + title, lettered part tags, the diagram zoomed to that step, one caption per action, narration as subtitles one sentence at a time.
3. Green checkpoint band at the end of the clip. The step is not marked complete until that band has played. Skipping away mid-clip does not count.
4. Choice steps show the options and which one to start with (chair step 7).
5. **Simple words** toggle: every step has both standard and simple narration.
6. **Play all** from the step list. **Replay** / **Next** on the player.
7. Orange **review** flag for parser uncertainty; **conflict** when the optional video disagrees with the manual. The printed manual always stands.

## Creator

`#/new` → `#/new/analyzing` → `#/p/:id/review` (when video fills or conflicts exist) → step list / player.

1. **parseManual** — rasterizes PDFs (pdf.js), measures photos, then reads letters / quantities / figure regions. Provider chain: layout vision (orange letter tags, step grids) → recorded MagicH fixture when that layout matches → OpenAI vision when a key is configured → PDF text-layer / OCR-like heuristics. Last resort is a structural page draft with uncertainty flags — not a silent stub.
2. **analyzeVideo** — fetches YouTube oEmbed, captions, and poster frames via the `npm run dev` proxy (`/api/pipeline/...`). Music-only audio is ignored; teaching actions are derived from visuals + the printed manual. Beats are aligned to manual steps: extras become `inferred_from_video` gap-fills; disagreements become orange conflicts. The recorded fixture URL exercises this path offline.
3. **mergeSources** — manual wins; video may add `inferred_from_video` actions/tips; disagreements become `review_notes` of kind `conflict` and never overwrite a manual action, figure, or part.
4. **validate** — schema + parts catalog.
5. **narrate** — fills standard + simple if the parse did not.

Analyzing checklist stages are the real pipeline phases (Reading manual → Watching video → Merging steps → Checking conflicts) with live status text.

On Review, **Accept** keeps an inferred video fill. **Keep manual** drops the conflict flag (manual already stands). **Use video** records the video claim as a tip and does **not** overwrite the manual action.

Drafts persist in **IndexedDB** in this browser. Large PDFs may hit browser storage limits until a job runner writes to disk.

### API keys (optional)

Copy `.env.example` to `.env`. Keys are **not** required for the sample fixture path or CI tests.

| Variable | Where | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | server (`npm run dev`) | `/api/pipeline/vision` posts page images to OpenAI (default model `gpt-4o-mini`) |
| `OPENAI_VISION_MODEL` | server | override model id |
| `VITE_OPENAI_API_KEY` | browser | last-resort direct call; **do not ship this in production** |

Without a key, photos still run local layout vision. Known MagicH / parts-list pages use the recorded fixture. Other manuals use PDF text when present; unknown photos get an honest incomplete catalog (letter tags if the orange grid is visible) and uncertainty notes.

### Sample: page photos + YouTube URL

1. `npm run dev` → **New guide**.
2. Name the project.
3. Manual: upload `public/fixtures/parts-list.jpg` and `public/fixtures/assembly-steps.jpg` (or the same files under `public/golden/pages/p-03.jpg` + `p-04.jpg`).
4. Video: paste `https://www.youtube.com/watch?v=vgfixture001` (recorded fixture — no network). Any real YouTube URL is fetched live in dev; if captions are music-only they are dropped.
5. Continue. Analyzing runs parse → video → merge → conflicts.
6. Review lists **Filled from video** (Accept) and **Conflicts** (Keep manual / Use video), then **Open guide**.

`public/golden/pages/` is the full chair scan if you want more steps. The golden player project on `#/` is authored JSON and is **not** overwritten by the creator.

### What's still stubbed

- Live **camera** QR scan (the field is a URL paste; same value a camera scan would fill)
- TTS audio (`<Audio>` slot in `StepClip`)
- Human step editor, auth, share/publish
- Native iOS app shell / App Store / marketing site

## Manual + QR / YouTube gap-fill

The printed or photographed **manual is the source of truth**. Many products also ship a QR on the box that opens a YouTube install video. That video is useful for things paper omits — order that is easier to *see*, click/feel, which way a part faces, hidden fasteners — and dangerous if it silently overrides the manual.

Pipeline rule: video **fills gaps**. If video and manual disagree, the step gets an orange conflict flag with both claims. A human resolves it on Review. We never drop a manual fact to match the video.

## Differentiators (product, not ads)

- Letter-faithful crops of the actual manual drawings (not a restyled 3D redo)
- Checkpoints: a step is not done until the green band
- Simple words: a second narration track on every step
- Provenance on parts/tips/actions: `manual` | `inferred` | `generated` | `inferred_from_video`
- Review flags for uncertainty and for manual-vs-video conflict

## What's done vs next

| Done | Next |
| --- | --- |
| Schema v0.2 (`source.manual` + optional `source.video`, `inferred_from_video`, structured review notes) | Camera QR scan (URL paste stands in) |
| Golden chair fixture still plays | TTS audio (`<Audio>` slot in `StepClip`) |
| Approved screen map: Projects, step list, clip player, New guide, Analyzing, Review | Human step editor |
| Clip player: Simple words, Play all, Replay/Next, checkpoints, review/conflict flags | Auth, share/publish |
| New guide + local draft persist + Review keep-manual / use-video | Native iOS app shell |
| parseManual: PDF raster + layout vision + optional OpenAI + recorded fixture | App Store packaging |
| analyzeVideo: YouTube fetch/captions/frames, music-only ignored, beat alignment | Marketing site / brand campaign (**later**) |
| mergeSources rules; Analyzing wired to real stages | |

## Layout

- `schema.py` — Pydantic contract v0.2
- `golden/newtral-magich-pro.json` — chair fixture (copy at `src/data/golden/`)
- `src/types/guide.ts` — TypeScript mirror
- `src/pipeline/` — parseManual, analyzeVideo, mergeSources, narrate, runPipeline, layout vision, YouTube fetch
- `src/pipeline/fixtures/` — recorded MagicH parse + sample video observation for CI/demo
- `public/fixtures/` — sample page photos for the creator walkthrough
- `src/pages/` — Projects, New guide, Analyzing, Review, step list, clip player
- `src/chrome/` — phone shell, header, toggles, buttons
- `src/lib/projectsStore.ts` — IndexedDB drafts
- `projects/` — on-disk convention for exported drafts
- `public/golden/pages/` — chair manual page images
- `src/remotion/` — clip templates (inline styles; Tailwind is chrome-only)

## Schema notes

- `source.manual` is required. `source.video` is optional (`youtube_url` and/or `packaging_url` and/or `file`).
- One Step == one clip. Parts catalog on the Guide; steps reference by id.
- Both narration levels are required.
- Figure bboxes are normalized `[x0, y0, x1, y1]` on the manual page image.
- `review_notes[].kind` is `uncertainty` or `conflict`.

Clip visual language (from the MagicH Pro manual, not a brand system): white paper, black line art, square corners, one orange accent (`#f0552b`). Green (`#1e8e5a`) is reserved for the checkpoint band.
