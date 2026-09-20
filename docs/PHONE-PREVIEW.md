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

## Backup (anonymous Vercel — expires unless claimed)

Root-host Vercel still uses relative Vite `base` (`./`). Claim within ~60 minutes if you use this path.

```bash
npm ci
npm run build
printf '%s\n' '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > /tmp/vercel-dist.json
unset CI
npx --yes vercel@latest deploy ./dist --temporary --yes --local-config /tmp/vercel-dist.json
```
