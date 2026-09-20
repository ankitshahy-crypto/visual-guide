# End-to-end session checklist

One human pass when the iOS shell (or a release cut) is ready. Not per-PR. Per-PR safety net stays `npm test`.

Display name: **Plainstep**. Icon: white field, black step path, orange square with white check.

Chrome is **dark** (near-black / charcoal, light text, one orange accent). The clip / Remotion **player stage stays paper-white** with black line art — do not invert the figure canvas.

Copy this file (or tick in GitHub) for the session. Fill **Findings** at the bottom.

**Platform for this session**

- [ ] Web (`npm run dev`)
- [ ] iOS Simulator (this shell)
- [ ] Physical iPhone (optional)

Run **A–C** on web. If this session signs off the iOS shell, repeat **A** (and **B** if a Mac + Simulator can pick files) on iOS. Packaged iOS has no Vite `/api/pipeline` server — use the fixture YouTube URL, or skip live captions (see README **What works where**).

---

## Prep

- [ ] `npm install`
- [ ] Web: `npm run dev` → http://localhost:5173 (`#/` home / Projects)
- [ ] iOS (Mac): `npm run ios:sync` then `npm run ios:open` — README **Open in Xcode / run Simulator**. Select **App** target, Team, iPhone simulator, Run
- [ ] Browser tab / PWA title is **Plainstep**
- [ ] iOS home screen / Simulator name is **Plainstep** (not a mid-word capital S)
- [ ] App icon is the locked mark (path → orange square check), not a generic Capacitor icon
- [ ] Optional: `npm test` once at the start (automated net; not a substitute for this list)

---

## A. Assembler — golden chair sample

Golden project: **MagicH Pro Chair** (`#/p/newtral-magich-pro-assembly`). Authored JSON — creator does not overwrite it.

- [ ] `#/` home is **dark chrome** with a large **orange** hero (not paper-white, not a yellow Pocket clone): **Plainstep** wordmark, How it works (Upload manual → Review AI steps → Follow clips with checkpoints), dominant **Try MagicH Pro Chair**, Your guides (drafts or empty-state card), orange **New guide**. Help `ankit@triagedesk.ai`. No tab bar.
- [ ] Open chair → step list: numbered rows, cropped thumbs (white paper thumbs), a duration on each row
- [ ] **Simple words** toggle is on the step list
- [ ] **Play all** is on the step list
- [ ] Open step 1: **white** clip player (paper stage) on **dark** chrome; number/title, letter tags, figure, captions. Letter tags stay black-on-white.
- [ ] Spoken narration on **standard** (fixture MP3s on the chair). If silent: iOS Silent switch / web autoplay — Replay after a tap. Status line under the clip documents browser-voice / none (README **Spoken narration**)
- [ ] Green checkpoint band plays at end of clip; leaving mid-clip does **not** mark the step done
- [ ] **Replay** restarts the clip; **Next** goes to the following step
- [ ] Choice overlay on chair **step 7**: options + which to start with; Continue into the clip
- [ ] Turn **Simple words** on (step list), open a step: captions **and** spoken track switch
- [ ] **Play all** from the list walks steps; ends back on the step list

---

## B. Creator — new guide

`#/new` → `#/new/analyzing` → `#/p/:id/review` (if fills/conflicts) → step list / player.

Continue is blocked without a name and without a PDF or page photos.

### Fixture path (no paid APIs)

Use this when OpenAI / live YouTube should not be required:

1. New guide → name the project
2. Manual: `public/fixtures/parts-list.jpg` and `public/fixtures/assembly-steps.jpg` (or `public/golden/pages/p-03.jpg` + `p-04.jpg`)
3. Video: `https://www.youtube.com/watch?v=vgfixture001` (recorded fixture, no network)
4. Continue

- [ ] Name is required (empty name shows an error)
- [ ] Manual is required (Continue without PDF/photos shows an error)
- [ ] PDF picker and page-photo picker both open (web file dialog; iOS Files / Photos)
- [ ] Optional YouTube URL field accepts a URL
- [ ] **Scan packaging QR** is URL paste (camera scan not in this build); paste works
- [ ] **Skip** video is allowed; Analyzing still runs on the manual
- [ ] Analyzing checklist moves: Reading manual → Watching video → Merging steps → Checking conflicts (live status text; skip-video still shows the video row as skipped)
- [ ] Fixture path above: Analyzing finishes without a paid key
- [ ] Review: **Filled from video** → **Accept** (if any fills)
- [ ] Review: **Conflicts** → **Keep manual** and **Use video** (Use video must **not** overwrite the printed action; it records a tip)
- [ ] **Open guide** → step list for that draft → play at least one step
- [ ] Draft appears under Your guides; golden chair is still the hero sample unchanged

On packaged iOS without `VITE_PIPELINE_API_URL`, a **live** YouTube URL may lack captions; the fixture URL above still exercises gap-fill offline. Note that in Findings if it fails.

---

## C. Regression / polish

- [ ] Reload the page (web) or kill/reopen the app (iOS): local **drafts** are still under Your guides (IndexedDB: this browser / this app install). Golden chair still the hero sample
- [ ] Chrome strings say **Plainstep** (tab title, home screen). No leftover **Visual Guide** in headers, titles, or system name
- [ ] Menu → **Help & support** is `mailto:ankit@triagedesk.ai` (legal line TriageDesk AI LLC). Dark chrome sheet.
- [ ] Chrome is dark (near-black), clip player stage is paper-white (black line art, orange do-this-now, green checkpoint on white)
- [ ] Safe areas on iOS: header below notch; Continue / Replay / Next above home indicator; light-content status bar (white icons on dark chrome)
- [ ] New guide file pick on iOS does not crash (photo library / camera usage strings are in Info.plist; camera scan still unused)

---

## Findings

Date:

Platform (web / iOS sim / device):

Commit / build:

| # | Area (A/B/C) | What happened | Severity (block / annoy / nits) |
| --- | --- | --- | --- |
| 1 |  |  |  |
