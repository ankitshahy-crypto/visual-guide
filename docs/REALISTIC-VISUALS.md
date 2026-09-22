# Realistic step stills

Plainstep’s clips stay tied to the manual: letter tags, checkpoints, simple words, and the action text do not change. What changes is the picture. When a generated photo exists for a step or a part, the player shows that photo. When it does not, the player crops the manual drawing the way it always has.

The iOS app and `npm run dev` never call an image API. They only load files that were generated ahead of time and committed (or copied into `public/`).

## Golden sample (MagicH Pro chair)

Committed photos:

- Steps: `public/golden/realistic/steps/s0.jpg` … `s9.jpg`
- Part chips: `public/golden/realistic/parts/A.jpg` … `R.jpg` (no letter O; the manual skips it)
- Index the player reads: `src/data/realistic-index.json`

Those stills were made from the golden page images (`public/golden/pages/`), the parts list in `src/data/golden/newtral-magich-pro.json`, and the cover photo on page 1. The manual JSON was not rewritten. Another guide id does not pick up this index, so drafts keep their own figure crops.

After you pull, the Simulator bundle includes the photos:

```bash
npm run ios:sync
```

Open the chair sample. Step 1 should show a photographed seat and mechanism, not only the pencil panel. The parts check (step •) should show a photo inside each letter chip. If a file is missing from the index, that one tile or step falls back to the manual crop or the text chip.

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

1. Reads a guide JSON (default: the MagicH golden file).
2. Crops each step’s figure bbox out of the manual page JPEG.
3. Sends that crop and the cover page to `POST https://api.openai.com/v1/images/edits` with the prompt from `src/pipeline/realisticPrompts.ts`.
4. If edits is rejected, retries once with a different multipart field name, then falls back to text-only `images/generations` and says so in the log. That fallback cannot see the diagram.
5. Writes JPEGs under `public/golden/realistic/` for the golden guide, and updates `src/data/realistic-index.json`.

Other flags:

```bash
npm run realistic -- --guide path/to/guide.json
npm run realistic -- --parts A,Q --force
```

For a guide that is not MagicH, files land in `public/realistic/<guide_id>/` plus an `index.json` beside them. The shipped player only auto-loads `src/data/realistic-index.json`. To show another guide’s stills, put that guide id and its paths into the bundled index (or merge them) and rebuild. Do not require a photo of the customer’s parts kit; the inputs are the manual pages and the parts list already in the guide.

Prompts tell the model the diagram is the spatial source of truth and the cover photo is the appearance source of truth. They forbid painted letters, arrows, and captions. The player still draws the black letter chips, the green checkpoint, and both narration tracks.

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
- It does not ask the assembler to photograph their kit.
