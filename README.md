# Plainstep

**Plainstep** turns **any** instruction set — furniture, toys, electronics, not chairs only — into clear, numbered clips. An assembler opens a project, taps a step, and watches a short clip with lettered part tags. The MagicH Pro sample prefers realistic photos of the parts and the assembly; any step without a generated still still uses the manual's own drawing.

This GitHub repository is still named `visual-guide`. The product / App Store display name is **Plainstep**. Legal owner: **TriageDesk AI LLC**. Help & support: [ankit@triagedesk.ai](mailto:ankit@triagedesk.ai).

The product destination is an **iOS App Store** app. This repo is the clip engine, data contract, and creator pipeline. **Marketing site and brand campaign come later.** Chrome here is the approved assembler/creator screen map (mobile-first, **dark chrome** default). The clip / Remotion player stage stays **paper white**.

The **Newtral MagicH Pro office chair is a golden test fixture**, not the product.

One step == one clip. The same React component (`src/remotion/StepClip.tsx`) plays live in the browser via `@remotion/player` and renders to MP4 via the Remotion CLI.

## How to run

```bash
npm install
npm run dev            # http://localhost:5173 — in-app home; try the chair sample
npm test               # pipeline + golden chair fixture
npm run test:pipeline  # same tests (merge, parse, video, review)
pip install -r requirements.txt
npm run validate       # pydantic check on both golden JSON copies

npm run studio         # Remotion Studio: scrub any golden clip
npm run render -- clip-s1 out/s1.mp4
npm run render:all
npm run narrate        # rebuild hashed TTS files for the golden chair (espeak-ng or OPENAI_API_KEY)
npm run realistic -- --dry-run   # prompts + cost for realistic stills; add OPENAI_API_KEY to generate
```

Human **end-to-end session** (not per-PR): [docs/E2E-CHECKLIST.md](docs/E2E-CHECKLIST.md). Per-PR safety net is still `npm test`.

**iOS on a Mac (product E2E):** [docs/IOS-DEPLOY.md](docs/IOS-DEPLOY.md) — clone → `npm install` → `npm run ios:sync` → Simulator. **GitHub Pages is not required** for that path. Chair + fixture run from the bundled `dist/`.

iPhone Safari (no Mac, optional preview only): [docs/PHONE-PREVIEW.md](docs/PHONE-PREVIEW.md) — GitHub Pages HTTPS at `https://ankitshahy-crypto.github.io/visual-guide/` after the Pages workflow on `main` (Settings → Pages → Source: **GitHub Actions**, once).

**Pages is static `dist/` only — no `/api/pipeline/*`.** Assembler: the **chair** sample. Creator: **Use fixture pages (no API key)** on `#/new`, or open `#/new?fixture=1`. Live PDF/photo + YouTube needs `npm run dev` (or a hosted API). A live upload on this preview errors instead of hanging on Analyzing.

After a Pages deploy, Analyzing must not show Safari’s *Importing a module script failed.* (that was a lazy `jpeg-js` / `pdfjs` chunk under the wrong `/assets/` path). Verify steps: [docs/PHONE-PREVIEW.md](docs/PHONE-PREVIEW.md) **Verify after merge**.

All `remotion` / `@remotion/*` packages are pinned to the same exact version in `package.json`.

## iOS shell (Capacitor)

This is the same Vite/React app inside a WKWebView. **Capacitor** wraps `npm run build` (`dist/`) rather than rewriting screens. Expo was not used: an Expo/React Native app would duplicate Projects / New guide / Analyzing / Review / step list / player+TTS, and EAS is Expo-only. A WebView-inside-Expo wrapper is a poorer fit than Capacitor, which is built for this.

Linux CI **cannot** compile an `.ipa`. Scaffold + `Info.plist` + Xcode project live in `ios/`. **Build on a Mac — full command list: [docs/IOS-DEPLOY.md](docs/IOS-DEPLOY.md).** GitHub Pages is not part of this path. Minimum iOS deployment is **17.0** (what Xcode recommends; current Xcode also rejects 14.0).

```bash
npm install
npm run ios:sync          # tsc + vite build → dist/ → ios/App/App/public + verify fixture/chair files
npm run ios:open          # opens ios/App/App.xcodeproj (refuses if you skipped sync)
# optional live create against Vite:
#   npm run dev          # terminal A
#   npm run ios:live-sync && npm run ios:open
```

In Xcode: **App** target → Team → **General → Minimum Deployments: iOS 17.0** (the project file already sets this) → iPhone 16 simulator (or any iOS 17+) → Run. Bundle id `app.plainstep.ios`. CocoaPods / EAS: not used (Capacitor 7 SPM). Simulator: free Apple ID. Device / TestFlight / App Store: Apple Developer Program ($99/year) — checklist in the deploy doc.

`ios/App/App/public` is gitignored (placeholder `.gitkeep` only); always `ios:sync` after pull and before Archive. Unset `CAPACITOR_LIVE_RELOAD` and `VITE_BASE` for a packaged build.

### What works where

| Surface | `npm run dev` (web) | Packaged iOS (this shell) |
| --- | --- | --- |
| Projects, New guide, Analyzing, Review, step list, player | Yes | Yes — same screens |
| Golden chair + hashed TTS MP3s | Yes | Yes (bundled in `dist/`) |
| IndexedDB drafts | This browser | This app install |
| PDF / page-photo picker | OS file picker | Files + Photos; camera permission is declared for a later QR scanner |
| Scan packaging QR | URL paste | URL paste (same) |
| Safe area / status bar | N/A (desk-black phone column) | Notch + home indicator padding; light-content status bar (white icons on dark chrome) |
| `/api/pipeline/*` (YouTube captions, OpenAI vision, espeak/OpenAI TTS files) | Vite middleware | **No Node server** in the ipa. Packaged `https://localhost` is treated as no-API (chair + fixture). Live-reload (`ios:live-sync` + `npm run dev`) or bake `VITE_PIPELINE_API_URL` for a hosted API. Browser `speechSynthesis` still works. |
| Outbound network | Whatever the browser allows | HTTPS to Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). Live YouTube / `noembed.com` only with live-reload or `VITE_PIPELINE_API_URL`. `NSAllowsLocalNetworking` allows HTTP to Vite on the Mac. No YouTube embed |
| Remotion CLI / `npm run narrate` | Yes | N/A (Mac/Linux tools, not in the ipa) |

App name on the home screen: **Plainstep**. Placeholder bundle id: `app.plainstep.ios`. Locked app icon: white field, black step path, orange check (`public/icons/plainstep-app-icon.png`, Xcode `AppIcon`).

**Spelling (locked).** UI, Xcode, and App Store listing: `Plainstep` (capital P only). Bundle id / hosts / future URL schemes: lowercase `plainstep`. A later logo lockup may use a mid-word capital S; the app display name does not.

### Permissions (`ios/App/App/Info.plist`)

| Key | Why |
| --- | --- |
| `NSPhotoLibraryUsageDescription` | New guide → page photos (system picker) |
| `NSCameraUsageDescription` | Declared for a future packaging-QR scan. **Not used yet** — the control is still URL paste. Do not remove the string or a later camera picker can crash. |
| `ITSAppUsesNonExemptEncryption` = `false` | HTTPS only; skip the export-compliance question in App Store Connect until you add crypto beyond TLS |
| `NSAllowsLocalNetworking` | Simulator / device live-reload to `npm run dev` (`http://localhost:5173` or the Mac LAN IP) |

Photo Library *add* / microphone keys are omitted (we do not save to Camera Roll or record audio).

### Next: Apple Developer + TestFlight (checklist)

Canonical copy: [docs/IOS-DEPLOY.md](docs/IOS-DEPLOY.md) §4–5. Paid account required after Simulator. Next step for **live** create (not fixture): deploy `/api/pipeline` and set `VITE_PIPELINE_API_URL` at build time.

1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs).
2. App Store Connect (ASC) → Apps → **+** → name **Plainstep** (capital P only), bundle id `app.plainstep.ios` (or your changed id), SKU of your choice. Copyright / seller: **TriageDesk AI LLC**.
3. Xcode target → Signing & Capabilities → Team. Enable **Automatically manage signing** for Debug. For distribution, Xcode creates an Apple Distribution cert + App Store provisioning profile.
4. `npm run ios:sync`. Product → Archive (Any iOS Device). Organizer → Distribute App → App Store Connect → Upload.
5. ASC → TestFlight → wait for processing → Internal testers (App Store Connect Users) first. External TestFlight needs a Beta App Review (privacy policy URL, contact, demo account if you later add auth). **Contact / support email: `ankit@triagedesk.ai`.** There is no hosted support or privacy URL yet — use that mailbox until a marketing/legal page exists. In-app: menu → **Help & support** (`mailto:ankit@triagedesk.ai`).
6. Fill ASC privacy nutrition labels. This build: no tracking (`PrivacyInfo.xcprivacy`); drafts stay on-device (IndexedDB). YouTube/Fonts are outbound HTTPS. Update the form if you host `VITE_PIPELINE_API_URL`. Privacy questions: **ankit@triagedesk.ai** (same mailbox; no separate privacy URL in this PR).
7. App Store review (later): screenshots, review notes (golden chair is a fixture; support contact `ankit@triagedesk.ai`), encryption export already set in Info.plist.

### Support & legal (locked)

| Field | Value |
| --- | --- |
| Product / App Store name | **Plainstep** |
| Legal owner | **TriageDesk AI LLC** |
| Help & support | [ankit@triagedesk.ai](mailto:ankit@triagedesk.ai) |
| In-app | Hamburger menu → **Help & support** (`mailto:`) |
| ASC Support URL | Not hosted yet (marketing site later). Testers and App Review: the email above |
| ASC Privacy Policy URL | Not hosted yet. Privacy contact: the same email. Nutrition labels: no tracking |

Change the bundle id in **both** `capacitor.config.ts` (`appId`) and Xcode (`PRODUCT_BUNDLE_IDENTIFIER` / Signing). Then `npx cap sync ios`.

## Screen map (this PR)

Phone-width column on a near-black desk. **App chrome** is charcoal (`#111214`) with light text and one orange accent (`#f0552b`) for primary actions and review badges. The **clip / Remotion player stage** stays paper white with black line art — manuals are black-on-white; do not invert the figure canvas. Letter tags are black squares. Green (`#1e8e5a`) is the checkpoint band on the white stage. Orange badge = review / conflict.

**Assembler**

| Hash | Screen | What it does |
| --- | --- | --- |
| `#/` | Home (Projects) | **Plainstep** wordmark, orange hero (pitch + How it works + sample card with page thumb + **Try sample**), Your guides, floating **Home / New / Help** pill. Create is **only** the bottom **New** tab (no header + / home New guide). Hamburger: Projects, **Help & support** (`mailto:ankit@triagedesk.ai`) |
| `#/help` | Help | In-app help & support; mail `ankit@triagedesk.ai`; seller TriageDesk AI LLC |
| `#/p/:id` | Step list | Simple words + Play all; cropped thumbs; numbered rows; orange Review badge |
| `#/p/:id/s/:stepId` | Clip player | Number/title, letter chips, figure, caption, green checkpoint (inside the clip); Replay / Next. Choice overlay when the step has options. |

**Creator**

| Hash | Screen | What it does |
| --- | --- | --- |
| `#/new` | New guide | Name; **Manual (required)** PDF + page photos; **Video (optional)** YouTube URL, Scan packaging QR (URL paste until camera exists), Skip; Continue. On a static host (GitHub Pages / missing pipeline): prominent **Use fixture pages (no API key)**. `#/new?fixture=1` starts that recorded path. |
| `#/new/analyzing` | Analyzing | Checklist in order: Reading manual → Watching video → Merging steps → Checking conflicts |
| `#/p/:id/review` | Review | Filled from video (Accept) + Conflicts (Keep manual / Use video) → **Open guide** (then step list / player for that draft) |

Scan packaging QR is labeled as a URL paste in this web build. Same field as a camera scan would fill.

## Assembler

Open a project (start with the chair sample):

1. Numbered step list. Each row has a thumbnail cropped from the manual drawing and a short duration.
2. Tap a step: black number box + title, lettered part tags, the diagram zoomed to that step, one caption per action, spoken narration in sync with subtitles one sentence at a time.
3. Green checkpoint band at the end of the clip. The step is not marked complete until that band has played. Skipping away mid-clip does not count.
4. Choice steps show the options and which one to start with (chair step 7).
5. **Simple words** toggle: every step has both standard and simple narration **and** matching spoken audio.
6. **Play all** from the step list. **Replay** / **Next** on the player.
7. Orange **review** flag for parser uncertainty; **conflict** when the optional video disagrees with the manual. The printed manual always stands.

## Creator

`#/new` → `#/new/analyzing` → `#/p/:id/review` (when video fills or conflicts exist) → step list / player.

On GitHub Pages (or any host without `/api/pipeline`), live PDF/photo + YouTube is short-circuited: Analyzing times out with *Live processing needs a server. Use fixture pages on this preview, or run locally with API.* Use the fixture button or `#/new?fixture=1` — recorded pages + `vgfixture001` finish Analyzing → Review offline. The chair sample is unchanged.

1. **parseManual** — rasterizes PDFs (pdf.js), measures photos, then reads letters / quantities / figure regions. Provider chain: layout vision (orange letter tags, step grids) → recorded MagicH fixture when that layout matches → OpenAI vision when a key is configured → PDF text-layer / OCR-like heuristics. Last resort is a structural page draft with uncertainty flags — not a silent stub.
2. **analyzeVideo** — fetches YouTube oEmbed, captions, and poster frames via the `npm run dev` proxy (`/api/pipeline/...`). Music-only audio is ignored; teaching actions are derived from visuals + the printed manual. Beats are aligned to manual steps: extras become `inferred_from_video` gap-fills; disagreements become orange conflicts. The recorded fixture URL exercises this path offline.
3. **mergeSources** — manual wins; video may add `inferred_from_video` actions/tips; disagreements become `review_notes` of kind `conflict` and never overwrite a manual action, figure, or part.
4. **validate** — schema + parts catalog.
5. **narrate** — fills standard + simple text if the parse did not. Spoken audio is hashed TTS (see below), not this text step.

Analyzing checklist stages are the real pipeline phases (Reading manual → Watching video → Merging steps → Checking conflicts) with live status text.

On Review, **Accept** keeps an inferred video fill. **Keep manual** drops the conflict flag (manual already stands). **Use video** records the video claim as a tip and does **not** overwrite the manual action.

Drafts persist in **IndexedDB** in this browser. Large PDFs may hit browser storage limits until a job runner writes to disk.

### API keys (optional)

Copy `.env.example` to `.env`. Keys are **not** required for the sample fixture path or CI tests.

| Variable | Where | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | server (`npm run dev`) | `/api/pipeline/vision` posts page images to OpenAI (default model `gpt-4o-mini`); `/api/pipeline/tts` can use OpenAI Speech |
| `OPENAI_VISION_MODEL` | server | override vision model id |
| `OPENAI_TTS_MODEL` | server | OpenAI speech model (default `tts-1`) |
| `OPENAI_TTS_VOICE` | server | OpenAI voice (default `alloy`) |
| `TTS_PROVIDER` | server | `auto` (default), `openai`, `espeak`, or `off` |
| `VITE_OPENAI_API_KEY` | browser | last-resort direct vision call; **do not ship this in production** |

Without a key, photos still run local layout vision. Known MagicH / parts-list pages use the recorded fixture. Other manuals use PDF text when present; unknown photos get an honest incomplete catalog (letter tags if the orange grid is visible) and uncertainty notes.

### Sample: page photos + YouTube URL

1. `npm run dev` → **New guide**.
2. Name the project.
3. Manual: upload `public/fixtures/parts-list.jpg` and `public/fixtures/assembly-steps.jpg` (or the same files under `public/golden/pages/p-03.jpg` + `p-04.jpg`). **Or** tap **Use fixture pages (no API key)** / open `#/new?fixture=1` (required on GitHub Pages).
4. Video: paste `https://www.youtube.com/watch?v=vgfixture001` (recorded fixture — no network). Any real YouTube URL is fetched live in dev; if captions are music-only they are dropped.
5. Continue. Analyzing runs parse → video → merge → conflicts.
6. Review lists **Filled from video** (Accept) and **Conflicts** (Keep manual / Use video), then **Open guide**.

`public/golden/pages/` is the full chair scan if you want more steps. The golden player project on `#/` is authored JSON and is **not** overwritten by the creator.

### Spoken narration (TTS)

The chair sample ships **fixture audio**: one MP3 per unique sentence under `public/narration/`, keyed by a SHA-256 prefix of the normalized text (`src/data/narration-index.json`). Unchanged lines are not re-rendered. `StepClip` mounts Remotion `<Audio>` when those files exist, so the live player and `npm run render` stay aligned. Subtitle cue windows follow measured audio duration (sped up slightly if speech is longer than the clip).

**Simple words** switches both the subtitle text and which hashed files play.

| Path | When it runs | Needs a paid key? |
| --- | --- | --- |
| **Fixture files** | Golden chair (and any committed hashes) | No |
| **Local espeak-ng** | `npm run narrate` and `POST /api/pipeline/tts` when `TTS_PROVIDER=auto` and no OpenAI key | No — `sudo apt-get install espeak-ng` (or `espeak`) plus `ffmpeg` |
| **OpenAI Speech** | Same endpoints when `OPENAI_API_KEY` is set (or `TTS_PROVIDER=openai`) | Yes — higher-quality cached MP3s |
| **Browser `speechSynthesis`** | Live player fallback when a step has no cached file (drafts, missing hashes) | No |
| **Off** | `TTS_PROVIDER=off` skips file generation | — |

Enable higher-quality cached files:

```bash
cp .env.example .env   # set OPENAI_API_KEY
npm run narrate        # writes public/narration/*.mp3 and the index
npm run dev
```

Local/dev without a key:

```bash
sudo apt-get install espeak-ng   # once
npm run narrate                  # fixture-quality speech via espeak
npm run dev                      # chair plays cached files; drafts use espeak via /api/pipeline/tts or browser voice
```

If neither files nor browser speech are available, the player shows a short status line under the clip pointing at this section. Analyzing, Review, and pipeline tests do not call TTS.

`public/narration/cache/` is gitignored runtime output from the dev API. Committed fixture files live directly in `public/narration/`.

### Realistic stills (MagicH sample)

Pencil crops are the fallback. When `src/data/realistic-index.json` has a photo for this guide and step, the clip and the step-list thumbnail show that photo instead. Part chips do the same. Letter tags, checkpoints, simple words, and the action text stay on the manual. The app does not call an image API.

Committed MagicH photos live in `public/golden/realistic/` (10 step stills and 17 part chips). They are grounded in the step diagrams, the parts list, and the cover photo already in the manual. A photo of the parts bag or the finished chair is never required. If a later PDF has no cover, the script looks up the model number from the manual, and `--product-photo` is only a fallback after that. How to regenerate, including `OPENAI_API_KEY`, `gpt-image-1`, and cost: [docs/REALISTIC-VISUALS.md](docs/REALISTIC-VISUALS.md).

```bash
npm run realistic -- --dry-run     # free: print prompts and a rough dollar estimate
npm run realistic -- --steps s1    # one still, needs OPENAI_API_KEY, skips existing files
npm run ios:sync                   # bundle the committed photos into the Simulator
```

### What's still stubbed

- Live **camera** QR scan (the field is a URL paste; same value a camera scan would fill). iOS camera permission is declared for that later scanner.
- Human step editor, auth, share/publish
- App Store submission / TestFlight upload (see iOS checklist). Marketing site and hosted privacy/support pages (email stands in).

## Manual + QR / YouTube gap-fill

The printed or photographed **manual is the source of truth**. Many products also ship a QR on the box that opens a YouTube install video. That video is useful for things paper omits — order that is easier to *see*, click/feel, which way a part faces, hidden fasteners — and dangerous if it silently overrides the manual.

Pipeline rule: video **fills gaps**. If video and manual disagree, the step gets an orange conflict flag with both claims. A human resolves it on Review. We never drop a manual fact to match the video.

## Differentiators (product, not ads)

- Realistic stills when a generated photo is bundled for that step or part; otherwise a letter-faithful crop of the manual drawing. Actions, letter tags, and checkpoints still come from the manual.
- Checkpoints: a step is not done until the green band
- Simple words: a second narration track on every step (text + spoken audio)
- Provenance on parts/tips/actions: `manual` | `inferred` | `generated` | `inferred_from_video`
- Review flags for uncertainty and for manual-vs-video conflict

## What's done vs next

| Done | Next |
| --- | --- |
| Schema v0.2 (`source.manual` + optional `source.video`, `inferred_from_video`, structured review notes) | Camera QR scan (URL paste stands in; iOS camera string is in Info.plist) |
| Golden chair fixture still plays | Human step editor |
| Approved screen map: Projects, step list, clip player, New guide, Analyzing, Review | Auth, share/publish |
| Clip player: Simple words, spoken TTS, Play all, Replay/Next, checkpoints, review/conflict flags | App Store / TestFlight (cert + ASC; checklist above) |
| Hashed TTS (`<Audio>` in `StepClip`; espeak fixture / OpenAI / browser fallback) | Hosted `/api/pipeline` for device YouTube captions / OpenAI |
| MagicH realistic stills (`public/golden/realistic/`, player falls back to the manual crop) | `npm run realistic` for any other PDF ([docs/REALISTIC-VISUALS.md](docs/REALISTIC-VISUALS.md)) |
| Capacitor iOS shell (`ios/`, bundle id `app.plainstep.ios`, product name Plainstep) | Marketing site / brand campaign (**later**) |
| Help & support `ankit@triagedesk.ai` (in-app mailto + ASC notes); owner TriageDesk AI LLC | Hosted support / privacy URLs |
| Dark chrome default (clip / Remotion stage stays paper-white) | System light theme (optional, later) |
| New guide + local draft persist + Review keep-manual / use-video | |
| parseManual: PDF raster + layout vision + optional OpenAI + recorded fixture | |
| analyzeVideo: YouTube fetch/captions/frames, music-only ignored, beat alignment | |
| mergeSources rules; Analyzing wired to real stages | |

## Layout

- `schema.py` — Pydantic contract v0.2
- `golden/newtral-magich-pro.json` — chair fixture (copy at `src/data/golden/`)
- `src/types/guide.ts` — TypeScript mirror
- `src/pipeline/` — parseManual, analyzeVideo, mergeSources, narrate, tts, runPipeline, layout vision, YouTube fetch
- `src/data/narration-index.json` — hashed TTS index for the golden chair
- `public/narration/` — cached MP3s (`{hash}.mp3`); `cache/` is runtime-only
- `src/pipeline/fixtures/` — recorded MagicH parse + sample video observation for CI/demo
- `public/fixtures/` — sample page photos for the creator walkthrough
- `src/pages/` — Home (Projects), New guide, Analyzing, Help, Review, step list, clip player
- `src/chrome/` — phone shell, header, bottom Home/New/Help pill, toggles, buttons (menu includes Help & support mailto)
- `src/lib/support.ts` — support email + legal owner constants
- `src/native/` — Capacitor status bar / keyboard / splash init
- `capacitor.config.ts` — app id `app.plainstep.ios`, app name Plainstep, `webDir: dist`
- `public/icons/plainstep-app-icon.png` — locked 1024 App Store / PWA icon
- `ios/` — Xcode project (SPM). `npm run ios:sync` copies `dist/` into `ios/App/App/public`
- `docs/IOS-DEPLOY.md` — Mac → Simulator / device / TestFlight (Pages not required)
- `docs/E2E-CHECKLIST.md` — one human pass (assembler + creator + iOS shell)
- `src/lib/projectsStore.ts` — IndexedDB drafts
- `projects/` — on-disk convention for exported drafts
- `public/golden/pages/` — chair manual page images
- `public/golden/realistic/` — MagicH sample photos (step stills + part chips)
- `src/data/realistic-index.json` — which golden steps and parts have those photos
- `docs/REALISTIC-VISUALS.md` — image script, `OPENAI_API_KEY`, regenerate, cost
- `src/remotion/` — clip templates (inline styles; Tailwind is chrome-only)

## Schema notes

- `source.manual` is required. `source.video` is optional (`youtube_url` and/or `packaging_url` and/or `file`).
- One Step == one clip. Parts catalog on the Guide; steps reference by id.
- Both narration levels are required.
- Figure bboxes are normalized `[x0, y0, x1, y1]` on the manual page image.
- `review_notes[].kind` is `uncertainty` or `conflict`.

Clip visual language (from the MagicH Pro manual, not a brand system): white paper, black line art, square corners, one orange accent (`#f0552b`) for “do this now” on the **clip stage**. App chrome is dark; do not invert the figure canvas. Green (`#1e8e5a`) is reserved for the checkpoint band.
