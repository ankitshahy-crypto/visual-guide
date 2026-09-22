# Realistic step stills

Plainstep turns a **procedure** into clips: a guide, ordered steps, and the parts those steps use. Assembly manuals are the critical path that proves the product. The MagicH Pro chair is the sample for that path, not a furniture-only generator. The same script accepts any guide JSON.

Clips stay tied to the source: letter tags, checkpoints, simple words, and the action text do not change. What changes is the picture. When a generated photo exists for a step or a part, the player shows that photo. When it does not, the player crops the source drawing the way it always has.

The iOS app and `npm run dev` never call an image API. They only load files that were generated ahead of time and committed (or copied into `public/`).

## Golden sample (MagicH Pro assembly)

Committed photos:

- Steps: `public/golden/realistic/steps/s0.jpg` … `s9.jpg`
- Part chips: `public/golden/realistic/parts/A.jpg` … `R.jpg` (no letter O; the manual skips it)
- Index the player reads: `src/data/realistic-index.json`

Those stills were made from three manual inputs only:

1. The step diagram cropped from `public/golden/pages/`.
2. The parts list text in `src/data/golden/newtral-magich-pro.json` (names, letters, quantities).
3. The finished-product photo already on cover page 1 (`pages/p-01.jpg`).

The guide JSON was not rewritten. Another guide id does not pick up this index, so drafts keep their own figure crops. Nobody has to photograph the parts or the finished product.

After you pull, the Simulator bundle includes the photos:

```bash
npm run ios:sync
```

Open the MagicH sample. Step 1 should show a photographed seat and mechanism, not only the pencil panel. The parts check (step •) should show a photo inside each letter chip. If a file is missing from the index, that one tile or step falls back to the source crop or the text chip.

## Finished-product photo (least work first)

For any guide, generation is conditioned on the step diagram, the parts-list text, and a finished-product photo when one can be found without asking the person following the steps. The script picks the photo in this order:

1. **Cover or hero page already in the manual.** MagicH uses page 1. This is the path for the golden sample. Zero extra effort.
2. **Lookup by model or SKU** read from the guide (`product.model`, the source file name, source notes). If those fields are empty, and `tesseract` is installed, the script OCRs the first two page images for a model token (MagicH’s are `MagicH-BPRO` / `MagicH-GPRO`), then tries the DuckDuckGo instant-answer image for `brand + SKU + category`. If that search returns nothing, generation continues.
3. **Optional `--product-photo path`** only when 1 and 2 did not produce a file. Never required. A photo passed while a cover exists is ignored.

```bash
npm run realistic -- --dry-run
# Product reference: manual-cover
# Finished-product photo is page 1 already in the manual
```

```bash
npm run realistic -- --guide path/to/other.json --product-photo ./finished-product.jpg
# --product-photo is used only if that guide has no cover/hero and the lookup misses
```

## Regenerate

```bash
cp .env.example .env   # set OPENAI_API_KEY
npm run realistic -- --dry-run          # print prompts and a cost estimate; no API call
npm run realistic -- --steps s1 --force # one step
npm run realistic                       # every step and part; skips files that already exist
```

| Variable | Default | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | (required to generate) | Sent only by this script, as `Authorization: Bearer` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Image model id |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium`, or `high` |
| `OPENAI_IMAGE_FIDELITY` | `high` | How closely `images/edits` follows the attached diagram and cover. Use `low` if results come back looking like the pencil sketch. |

The script (`scripts/generate-realistic.mjs` → `src/pipeline/cliRealistic.ts`):

1. Reads a guide JSON (default: the MagicH golden file; any other procedure uses `--guide`).
2. Resolves the finished-product photo with the priority above. The MagicH sample stops at the cover page.
3. Crops each step’s figure bbox out of the manual page JPEG.
4. Sends that crop, the product photo when one was resolved, and a prompt that includes the parts list (`src/pipeline/realisticPrompts.ts`) to `POST https://api.openai.com/v1/images/edits`.
5. If edits is rejected, retries once with a different multipart field name, then falls back to text-only `images/generations` and says so in the log. That fallback cannot see the diagram or the cover.
6. Writes JPEGs under `public/golden/realistic/` for the golden guide, and updates `src/data/realistic-index.json` (including `product_reference`).

Other flags:

```bash
npm run realistic -- --guide path/to/guide.json
npm run realistic -- --parts A,Q --force
```

For a guide id other than the MagicH sample, files land in `public/realistic/<guide_id>/` plus an `index.json` beside them. The shipped player only auto-loads `src/data/realistic-index.json`. To show another procedure’s stills, put that guide id and its paths into the bundled index (or merge them) and rebuild. Do not require a photo of the parts or the finished product; the inputs are the source pages and the parts list already in the guide.

Prompts tell the model the diagram is the spatial source of truth, the parts list is the name and quantity source, and the resolved product photo (the manual cover, on the MagicH sample) is the appearance source. They forbid painted letters, arrows, and captions. The player still draws the letter chips, the checkpoint, and both narration tracks.

## Cost

Rough `gpt-image-1` list prices used by `--dry-run` (USD, before the cost of the input images, which `input_fidelity=high` increases). Confirm current numbers at [openai.com/api/pricing](https://openai.com/api/pricing) — they change.

| Quality | Step still (1536×1024) | Part chip (1024×1024) |
| --- | --- | --- |
| low | ~$0.016 | ~$0.011 |
| medium | ~$0.063 | ~$0.042 |
| high | ~$0.25 | ~$0.167 |

A full MagicH pass is 10 steps + 17 parts: about **$1–2 at medium**, and several times that at high, plus input-image tokens. The committed sample is already paid for; shipping the app does not spend this again. `--dry-run` is free. Existing files are skipped unless you pass `--force`.

## What this spike does not do

- It does not generate stills inside the iOS app or on GitHub Pages.
- It does not replace manual actions, quantities, letter ids, checkpoints, or simple-words narration.
- It does not ask anyone to photograph the parts or the finished product. A user photo is never required. `--product-photo` is only a fallback when the source has no cover or hero and the model-number lookup misses.
- It does not add a second schema for non-assembly procedures. The same guide, steps, and parts are the contract; other domains wait until this assembly sample proves the clips.
