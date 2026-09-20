# Visual Guide

Visual Guide turns assembly manuals (PDF or page photos) into clear, numbered instructional videos. The product destination is an **iOS App Store** app: an assembler opens a project, taps a step, and watches a short clip that uses the manual's own drawings and lettered part tags.

This repository is the foundation: the data contract, one golden guide (the Newtral MagicH Pro office chair), and a working clip player. Chrome is intentionally minimal. Screen polish and brand system wait until the owner agrees on design.

One step == one clip. The same React component (`src/remotion/StepClip.tsx`) plays live in the browser via `@remotion/player` and renders to MP4 via the Remotion CLI.

## How to run

```bash
# player
npm install
npm run dev            # http://localhost:5173 — golden chair guide

# schema check (needs: pip install -r requirements.txt)
npm run validate

# optional: Remotion studio + file render
npm run studio         # scrub any clip frame by frame
npm run render -- clip-s1 out/s1.mp4
npm run render:all     # every step, standard + simple narration
```

All `remotion` / `@remotion/*` packages are pinned to the same exact version in `package.json`.

## Assembler (this PR)

Open the chair project and you get:

1. A numbered step list. Each row has a thumbnail cropped from the manual drawing and a short duration.
2. Tap a step to play its clip: black number box + title, lettered part tags, the diagram zoomed to that step, one caption per action, narration as subtitles one sentence at a time.
3. A green checkpoint band at the end of the clip. The step is not marked complete until that band has played (the player `ended` event). Skipping away mid-clip does not count.
4. Choice steps show the options and which one to start with (chair step 7, backrest height).
5. **Simple words** toggle: every step has both standard and simple narration.
6. **Play all** plays from the current step through the rest. Tap any step to replay it.
7. An orange **review** flag when the parser left uncertainty notes (chair step 8, silicone cover quantity).

First example project: **Newtral MagicH Pro** office chair (`golden/newtral-magich-pro.json`).

## What's done vs not

| Done now | Not yet (roadmap) |
| --- | --- |
| Schema v0.1 (`schema.py` + TS mirror) | Upload PDF / page photos |
| Golden chair guide JSON | Vision parse → draft guide |
| Clip player against that guide | Human review / step editor |
| Simple words, Play all, review flags, checkpoint | Auth |
| Remotion templates (`figure_action`, `options`, `parts_overview`) | TTS audio (`<Audio>` slot in `StepClip` once files exist) |
| Page-crop math shared by list thumbs and clips | Batch render + share / publish |
| | Native iOS app shell |
| | App Store packaging |

### Creator pipeline (next)

Upload PDF or photos → vision parse → validate against `schema.py` → resolve `review_notes` → TTS → Remotion render → share. Do not treat any of that as implemented in this PR.

### iOS / App Store (later)

Ship a native iOS shell that loads this player (or its rendered clips), handles on-device / account projects, and meets App Store requirements (signing, privacy, playback background behavior). This repo is the clip engine and data contract that shell will wrap.

## Layout

- `schema.py` — Pydantic contract v0.1 (parser, player, renderer)
- `golden/newtral-magich-pro.json` — canonical golden guide (copy also at `src/data/golden/` for the app)
- `src/types/guide.ts` — TypeScript mirror of the schema
- `src/lib/timing.ts` — every beat of a clip (title, actions, options, checkpoint)
- `src/lib/crop.ts` — bbox → page-crop math
- `src/lib/pageImage.ts` — `pages/p-01.jpg` → `public/golden/pages/`
- `src/remotion/` — clip templates; inline styles only (Tailwind is chrome-only)
- `src/pages/ProjectDetail.tsx` — player + step list; mobile-first, two-column on desktop
- `public/golden/pages/` — rendered manual pages the figures crop from

## Schema notes

- One Step == one clip. Multi-action steps become beats inside the clip so numbering matches the manual.
- Parts are a catalog on the Guide; steps reference them by id.
- Narration ships at two reading levels. Both are required so the Simple words toggle is never empty.
- Figure bboxes are normalized `[x0, y0, x1, y1]` on the rendered source page image.
- `review_notes` carry parser uncertainty for a human to resolve.

Clip visual language (from the MagicH Pro manual, not a brand system): white paper, black line art, square corners, one orange accent (`#f0552b`). Green (`#1e8e5a`) is reserved for the checkpoint band.
