# Visual Guide

Visual Guide turns **any** instruction set — furniture, toys, electronics, not chairs only — into clear, numbered clips. An assembler opens a project, taps a step, and watches a short video that uses the manual's own drawings and lettered part tags.

The product destination is an **iOS App Store** app. This repo is the clip engine, data contract, and creator pipeline. **Marketing site and brand campaign come later.** Chrome here is the approved assembler/creator screen map (mobile-first, paper white).

The **Newtral MagicH Pro office chair is a golden test fixture**, not the product.

One step == one clip. The same React component (`src/remotion/StepClip.tsx`) plays live in the browser via `@remotion/player` and renders to MP4 via the Remotion CLI.

## How to run

```bash
npm install
npm run dev            # http://localhost:5173 — projects list; open the chair sample
npm run test:pipeline  # mergeSources rules (manual wins, video gap-fill, conflicts)
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

## Creator (this PR)

`#/new` → `#/new/analyzing` → `#/p/:id/review` (when video fills or conflicts exist) → step list / player.

1. **parseManual** — turns uploads into `source.manual` pages the player can crop. Vision read of letters/bboxes is stubbed (placeholder part `X`, full-page crop, review flags).
2. **analyzeVideo** — stores the locator. Does **not** fetch YouTube yet. If a URL is present it proposes example gap-fills (click/feel, orientation) plus a conflict so merge can be tested.
3. **mergeSources** — real rules: manual wins; video may add `inferred_from_video` actions/tips; disagreements become `review_notes` of kind `conflict` and never overwrite a manual action, figure, or part.
4. **validate** — schema + parts catalog.
5. **narrate** — fills standard + simple if the parse did not.

On Review, Accept keeps an inferred video fill. Keep manual drops the conflict flag (manual already stands). Use video records the video claim as a tip and does **not** overwrite the manual action.

Drafts persist in **IndexedDB** in this browser. Large PDFs may hit browser storage limits until a job runner writes to disk.

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
| Schema v0.2 (`source.manual` + optional `source.video`, `inferred_from_video`, structured review notes) | Vision model on page images (letters, qty, bboxes) |
| Golden chair fixture still plays | PDF page rasterization (pdf.js) |
| Approved screen map: Projects, step list, clip player, New guide, Analyzing, Review | YouTube / packaging-QR fetch + transcription + beat alignment |
| Clip player: Simple words, Play all, Replay/Next, checkpoints, review/conflict flags | Camera QR scan (URL paste stands in) |
| New guide + local draft persist + Review keep-manual / use-video | TTS audio (`<Audio>` slot in `StepClip`) |
| Pipeline modules with real merge rules; stubs labeled | Human step editor |
| | Auth, share/publish |
| | Native iOS app shell |
| | App Store packaging |
| | Marketing site / brand campaign (**later**) |

## Layout

- `schema.py` — Pydantic contract v0.2
- `golden/newtral-magich-pro.json` — chair fixture (copy at `src/data/golden/`)
- `src/types/guide.ts` — TypeScript mirror
- `src/pipeline/` — parseManual, analyzeVideo, mergeSources, narrate, runPipeline
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
