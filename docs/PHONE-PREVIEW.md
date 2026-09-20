# iPhone Safari preview

Durable public HTTPS URL of **main** (in-app Plainstep home + Home / New / Help pill). No Mac. Does **not** expire in 60 minutes.

**Open this after merge + first green Pages run:**

https://ankitshahy-crypto.github.io/visual-guide/

## Owner: enable GitHub Pages (once)

If Actions → **Pages** fails with “Get Pages site failed” / 404, flip the source:

1. Open https://github.com/ankitshahy-crypto/visual-guide/settings/pages
2. **Settings → Pages**
3. **Build and deployment → Source** → **GitHub Actions** (not “Deploy from a branch”)
4. Save if GitHub shows a save control
5. **Actions → Pages → Run workflow** (branch `main`), or push / merge to `main`

The workflow in `.github/workflows/pages.yml` builds `npm run build` with `VITE_BASE=/visual-guide/` and deploys `dist/`.

## What you should see

1. iPhone Safari → paste https://ankitshahy-crypto.github.io/visual-guide/
2. `#/` is dark chrome with a large **orange** hero (**Clear assembly videos from any manual**), How it works, **Try MagicH Pro Chair**, and a floating **Home / New / Help** pill.
3. Golden chair + hashed MP3s work without an API key. If audio is silent, tap Replay (Safari autoplay).

This host is a static `dist/` SPA. There is no Node `/api/pipeline/*`. Do not set `VITE_OPENAI_API_KEY`.

## Creator on this preview

Pages ships `dist/` only. Live PDF / page-photo + YouTube waits on APIs that 404 — that used to hang on **Analyzing**. Now:

- New guide shows **Use fixture pages (no API key)** first.
- `#/new?fixture=1` loads the recorded parts-list + assembly-steps photos and `vgfixture001`, then Analyzing → Review offline.
- A live upload without that fixture path errors immediately: *Live processing needs a server. Use fixture pages on this preview, or run locally with API.*

**Chair sample is unaffected.** For live processing, run `npm run dev` (or a host with `/api/pipeline`).

## Verify after merge (Pages)

Wait for Actions → **Pages** on `main` to be green, then hard-refresh Safari (or open a Private tab) so the old hashed JS is not reused.

1. https://ankitshahy-crypto.github.io/visual-guide/ — home, orange hero, Home / New / Help pill.
2. **Try MagicH Pro Chair** → step list thumbs load (not `/assets/...` 404s) → open step 1. Paper-white clip + hashed MP3. Replay if silent.
3. `#/new` → **Use fixture pages (no API key)** (or `#/new?fixture=1`). Analyzing checklist must advance; it must **not** show *Importing a module script failed.*
4. Analyzing → Review → Open guide. Draft appears under Your guides. Chair sample still on home.

Local reproduction of the same `base` (before merge):

```bash
VITE_BASE=/visual-guide/ npm run build
node scripts/check-pages-chunks.mjs
npx vite preview --base /visual-guide/ --host --port 4173
# open http://127.0.0.1:4173/visual-guide/#/new?fixture=1
# then http://127.0.0.1:4173/visual-guide/#/p/newtral-magich-pro-assembly
```

## Backup (anonymous Vercel — expires unless claimed)

Root-host Vercel still uses relative Vite `base` (`./`). Claim within ~60 minutes if you use this path.

```bash
npm ci
npm run build
printf '%s\n' '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > /tmp/vercel-dist.json
unset CI
npx --yes vercel@latest deploy ./dist --temporary --yes --local-config /tmp/vercel-dist.json
```
