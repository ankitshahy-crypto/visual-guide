# Visual Guide

Visual Guide turns **any** instruction set — furniture, toys, electronics, not chairs only — into clear, numbered clips. An assembler opens a project, taps a step, and watches a short video that uses the manual's own drawings and lettered part tags.

The product destination is an **iOS App Store** app. This repo is the clip engine, data contract, and creator pipeline. **Marketing site and brand campaign come later.** Chrome here is a working form + player so the owner can agree on design before screen polish.

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

## Assembler

Open a project (start with the chair sample):

1. Numbered step list. Each row has a thumbnail cropped from the manual drawing and a short duration.
2. Tap a step: black number box + title, lettered part tags, the diagram zoomed to that step, one caption per action, narration as subtitles one sentence at a time.
3. Green checkpoint band at the end of the clip. The step is not marked complete until that band has played. Skipping away mid-clip does not count.
4. Choice steps show the options and which one to start with (chair step 7).
5. **Simple words** toggle: every step has both standard and simple narration.
6. **Play all** from the current step. Tap any step to replay it.
7. Orange **review** flag for parser uncertainty; **conflict** when the optional video disagrees with the manual. The printed manual always stands.

## Creator (this PR)

`#/new` — name the project, upload a PDF and/or page photos (required), optionally paste a YouTube URL and/or a packaging QR URL. That runs:

1. **parseManual** — turns uploads into `source.manual` pages the player can crop. Vision read of letters/bboxes is stubbed (placeholder part `X`, full-page crop, review flags).
2. **analyzeVideo** — stores the locator. Does **not** fetch YouTube yet. If a URL is present it proposes example gap-fills (click/feel, orientation) plus a conflict so merge can be tested.
3. **mergeSources** — real rules: manual wins; video may add `inferred_from_video` actions/tips; disagreements become `review_notes` of kind `conflict` and never overwrite a manual action, figure, or part.
4. **validate** — schema + parts catalog.
5. **narrate** — fills standard + simple if the parse did not.

Drafts persist in **IndexedDB** in this browser. Download draft JSON from the player to commit under `projects/<id>/guide.json` (see that folder's README). Large PDFs may hit browser storage limits until a job runner writes to disk.

## Manual + QR / YouTube gap-fill

The printed or photographed **manual is the source of truth**. Many products also ship a QR on the box that opens a YouTube install video. That video is useful for things paper omits — order that is easier to *see*, click/feel, which way a part faces, hidden fasteners — and dangerous if it silently overrides the manual.

Pipeline rule: video **fills gaps**. If video and manual disagree, the step gets an orange conflict flag with both claims. A human resolves it. We never drop a manual fact to match the video.

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
| Clip player: Simple words, Play all, checkpoints, review/conflict flags | YouTube / packaging-QR fetch + transcription + beat alignment |
| New project form + local draft persist | TTS audio (`<Audio>` slot in `StepClip`) |
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
- `src/pages/` — project list, new project, player
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
