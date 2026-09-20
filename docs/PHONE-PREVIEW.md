# iPhone Safari preview

Public HTTPS preview of **main** (in-app Plainstep home + Home / New / Help pill). Open in iPhone Safari — no Mac required.

Live URL and claim link are posted on the latest preview PR after each anonymous Vercel deploy. **Claim within ~60 minutes** or the temporary URL expires.

## What you should see

1. Paste the live URL in Safari.
2. `#/` is dark chrome with a large **orange** hero (**Clear assembly videos from any manual**), How it works, **Try MagicH Pro Chair**, and a floating **Home / New / Help** pill.
3. Golden chair + hashed MP3s work without an API key. If audio is silent, tap Replay (Safari autoplay).

This host is a static `dist/` SPA. There is no Node `/api/pipeline/*`. Do not set `VITE_OPENAI_API_KEY`.

## Redeploy (anonymous Vercel)

```bash
npm ci
npm run build
printf '%s\n' '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' > /tmp/vercel-dist.json
unset CI
npx --yes vercel@latest deploy ./dist --temporary --yes --local-config /tmp/vercel-dist.json
```

The CLI prints a `*.vercel.app` URL and `https://vercel.com/claim-deployment?code=…`. Claim it so the preview stays up.
