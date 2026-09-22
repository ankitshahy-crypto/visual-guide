# Plainstep — Mac → iOS Simulator (real E2E)

This is the **local iOS path**. It does **not** use GitHub Pages. Pages was an accuracy preview in Safari; the product destination is this Capacitor shell on a Mac.

Linux CI cannot compile an `.ipa`. You need a MacBook + Xcode. After these steps, Simulator runs the same Vite `dist/` the web app builds — **chair sample + recorded fixture** work offline (no API key, no hosted API, no Pages).

Display name: **Plainstep**. Bundle id: `app.plainstep.ios`. Icon: white field, black step path, orange check.

---

## 0. One-time Mac tools

| Tool | Needed? | Notes |
| --- | --- | --- |
| macOS + **Xcode 16+** | **Yes** | App Store → Xcode. Then Xcode → Settings → Platforms → install the **iOS** SDK. Minimum deployment is **iOS 17.0** (Xcode’s recommended Minimum Deployments). Current Xcode rejects 14.0. |
| Xcode command-line tools | Yes | `xcode-select --install` if `xcodebuild` is missing |
| **Node 22** + npm | Yes | `node -v` |
| Apple ID | Simulator | Free. Add it in Xcode → Settings → Accounts if Run asks for a team |
| **Apple Developer Program ($99/year)** | Device, TestFlight, App Store | Not required to click through Simulator |
| CocoaPods / `pod install` | **No** | Capacitor 7 uses Swift Package Manager (`ios/App/CapApp-SPM`) |
| Expo / EAS | **No** | Not an Expo app |
| GitHub Pages | **No** | Do not set `VITE_BASE`. Do not open the `.github.io` URL in the app |

Open Xcode once so it can finish installing simulators (Window → Devices and Simulators → Simulators → + → iPhone 16 or any iOS 17+).

---

## 1. Clone, install, build, sync, open

Exact commands, from Terminal.app, on the Mac:

```bash
git clone https://github.com/ankitshahy-crypto/visual-guide.git
cd visual-guide
git checkout main
git pull origin main

npm install
npm run build
npx cap sync ios
npx cap open ios
```

Equivalent npm scripts (same effect):

```bash
npm install
npm run ios:sync          # build + cap sync ios + verify chair/fixture files landed in ios/App/App/public
npm run ios:open          # opens ios/App/App.xcodeproj (refuses if you skipped ios:sync)
```

What `ios:sync` does:

1. `tsc --noEmit && vite build` with `CAPACITOR_IOS_BUILD=1`, which forces `base: "./"` even if the shell still has Pages `VITE_BASE=/visual-guide/`. That prefix 404s every module script and the WKWebView stays dark.
2. Copies `dist/` → `ios/App/App/public` (that folder is gitignored; a `.gitkeep` exists only so Xcode’s folder reference is not red after clone).
3. Refreshes `capacitor.config.json` + SPM path deps under `node_modules/@capacitor/*`.

`ios/App/App/public` must exist **before** Run. Always `ios:sync` after `git pull` or web changes.

---

## 2. Run in the iOS Simulator

In Xcode:

1. Left sidebar: select the **App** target (the project is `App.xcodeproj`).
2. Signing & Capabilities → **Automatically manage signing** → Team = your Apple ID (Personal Team is enough for Simulator). Bundle Identifier stays **`app.plainstep.ios`**. If Xcode says the id is taken on a *device* profile, change it in **both** Xcode and `capacitor.config.ts` (`appId`), then `npx cap sync ios` again.
3. **General → Minimum Deployments** must be **iOS 17.0**. The project file already sets this. If a local Xcode copy still shows 14.0 or 15.0, set it to 17.0 and rebuild.
4. Run destination (toolbar): **iPhone 16** (or any iOS 17+ simulator). Not “Any iOS Device” — that is for Archive.
5. Press **Run** (▶). First launch resolves Swift packages (`capacitor-swift-pm`); needs network once.
6. Home screen name is **Plainstep**. You should see dark chrome, the orange hero, **Try sample**, and the Home / New / Help pill.

If Run fails:

| Symptom | Fix |
| --- | --- |
| `public` / `index.html` missing | `npm run ios:sync` then Run again |
| SPM / Capacitor package not found | `npm install` then File → Packages → Reset Package Caches |
| Signing / Team required | Xcode → Settings → Accounts → Apple ID; pick Personal Team |
| Blank white/black WebView | `npm run ios:sync` (forces `base: "./"`). Confirm `ios/App/App/public/index.html` uses `./assets/…`, not `/visual-guide/` or `/assets/…`. Unset `CAPACITOR_LIVE_RELOAD` before a device Run — `http://localhost:5173` is the Mac, and the phone stays dark. See **Physical iPhone** below. |
| Launch pauses on `AppDelegate` with `EXC_BREAKPOINT` (black screen) | Current Xcode asserts when an app has no UIScene lifecycle. `Info.plist` and `application(_:configurationForConnecting:)` both attach `Main.storyboard` (the bridge). Do not replace that window in `SceneDelegate`. Audio session errors are logged and do not abort launch. |
| Spoken audio silent | Category is `.playback` with `.mixWithOthers` (default mode). That ignores the Silent switch and does not use `.spokenAudio`, which can trap on device during launch. If setup fails, the app still opens; tap Replay. |

### Physical iPhone (blank screen)

Xcode **Build Succeeded** only compiles the shell. The home UI is the Vite bundle in `ios/App/App/public`, which git does not contain. After every `git pull`:

```bash
git pull origin main
npm install
unset CAPACITOR_LIVE_RELOAD
unset VITE_BASE
npm run ios:sync          # must print: ios bundle: ok
```

Then Xcode → destination **your iPhone** → **Run**. You should see dark chrome, the orange hero, **Try sample**, and Home / New / Help.

What was keeping the phone black:

- `application(_:configurationForConnecting:)` replaced the Info.plist scene and did not attach `Main.storyboard`, so the Capacitor bridge never came from the storyboard. `SceneDelegate` also built a second window. Capacitor creates the WKWebView at size zero; if that view never grows, Run looks successful and the screen stays black.
- `CAPACITOR_LIVE_RELOAD=http://localhost:5173` (`npm run ios:live-sync`) is the Mac. On a phone, localhost is the phone. The shell now ignores a loopback `server.url` on device and loads bundled `public/`. Simulator live-reload can still use localhost. Device live-reload needs the Mac LAN IP (section 3).
- `VITE_BASE=/visual-guide/` (GitHub Pages) makes `index.html` request `/visual-guide/assets/…`, which 404s in the app. `npm run ios:sync` forces `base: "./"` (`./assets/…`) even if that variable is still set.

If the bundle is missing or the document never loads, the phone shows a short message instead of a black view (and Xcode logs lines starting with `Plainstep:`). A stuck **Loading Plainstep…** means `index.html` loaded and the module script did not.

### Safari Web Inspector (the app WebView)

1. iPhone: **Settings → Safari → Advanced → Web Inspector** on.
2. Mac Safari: **Settings → Advanced → Show features for web developers**.
3. Connect the iPhone, tap Trust, unlock it, and Run Plainstep from Xcode (Debug). The web view is inspectable on iOS 16.4+.
4. Mac Safari menu **Develop → [your iPhone] → Plainstep**. The page is `capacitor://localhost` (Capacitor does not actually serve `https://localhost`; WKWebView refuses an `https` custom scheme).
5. Use the Console for module, MIME, and 404 errors. Reload from the inspector after `ios:sync` if you changed web code.

**Assembler (no API):** tap **Try sample** (MagicH Pro Chair) → step list → play a step (paper-white stage, hashed MP3s, green checkpoint). Chair is bundled in `dist/`.

**Creator (no API):** New guide → **Use fixture pages (no API key)** (or `#/new?fixture=1`) → Analyzing → Review → Open guide. Packaged iOS is treated like a static host: no `/api/pipeline`, so live PDF/YouTube is blocked on purpose. Fixture + chair do **not** need Pages.

Full click-through: [E2E-CHECKLIST.md](E2E-CHECKLIST.md) (tick iOS Simulator).

---

## 3. Optional: Simulator against local API (`npm run dev` + cap)

Packaged `dist/` has **no Node server**. For *live* create (your own PDF/photos + a real YouTube URL) while developing, point the WKWebView at Vite so `/api/pipeline/*` is same-origin.

**Two terminals**, Mac + Simulator (Simulator shares the Mac loopback — `localhost` works):

```bash
# Terminal A — keep this running
npm run dev
# http://localhost:5173  (Vite middleware = /api/pipeline)

# Terminal B
npm run ios:live-sync     # CAPACITOR_LIVE_RELOAD=http://localhost:5173 npm run ios:sync
npm run ios:open
```

Then Run in Xcode. The app loads Vite (HMR works). New guide Continue talks to the local API. Unset live-reload before TestFlight:

```bash
unset CAPACITOR_LIVE_RELOAD
npm run ios:sync
```

`ios:sync` warns if `capacitor.config.json` still has `server.url`.

### Physical iPhone on the same Wi-Fi

Simulator can use `localhost`. A device cannot — use the Mac LAN IP and bind Vite to the LAN:

```bash
ipconfig getifaddr en0          # e.g. 192.168.1.12
npm run dev -- --host --port 5173
CAPACITOR_LIVE_RELOAD=http://192.168.1.12:5173 npm run ios:sync
npm run ios:open
```

Info.plist sets `NSAllowsLocalNetworking` so HTTP to localhost / the LAN is allowed. Capacitor also sets `cleartext: true` when the live-reload URL is `http://`.

Paid Developer Program is required to Run on a physical device (signing).

---

## 4. Device / TestFlight / App Store (paid account)

Not required for Simulator E2E.

1. Enroll: [developer.apple.com/programs](https://developer.apple.com/programs) — **$99/year**. Seller: **TriageDesk AI LLC**.
2. App Store Connect → Apps → **+** → name **Plainstep** (capital P only), bundle id **`app.plainstep.ios`**, SKU of your choice.
3. Xcode → App target → Signing & Capabilities → Team (paid). Enable **Automatically manage signing** for Debug. Distribution: Apple Distribution cert + App Store profile (Xcode can create these).
4. Confirm **no** `CAPACITOR_LIVE_RELOAD` and **no** `VITE_BASE`. `npm run ios:sync`.
5. Destination: **Any iOS Device**. Product → **Archive**. Organizer → Distribute App → App Store Connect → Upload.
6. ASC → TestFlight → wait for processing → Internal testers first. External TestFlight needs Beta App Review. Support: `ankit@triagedesk.ai`. Privacy / support URLs are not hosted yet — use that mailbox.
7. Privacy nutrition labels: this build has no tracking (`PrivacyInfo.xcprivacy`); drafts stay on-device (IndexedDB). Update the form if you ship `VITE_PIPELINE_API_URL`.

Change the bundle id in **both** `capacitor.config.ts` (`appId`) and Xcode (`PRODUCT_BUNDLE_IDENTIFIER`). Then `npx cap sync ios`.

---

## 5. Next step for live create: deploy the pipeline API

Simulator packaged builds are enough to sign off **chair + fixture**. Live PDF / photo + real YouTube captions / OpenAI vision / file TTS need the same routes Vite serves at `/api/pipeline/*` (`src/pipeline/devApi.ts`).

1. Deploy that API (any HTTPS host). Stub is fine while the host is empty: set the env and ship a build that *points* at it.
2. In `.env` (never commit secrets):

   ```bash
   VITE_PIPELINE_API_URL=https://your-host.example/plainstep
   ```

   Copy from `.env.example`. The value is baked in at `vite build` time (`import.meta.env.VITE_PIPELINE_API_URL`).
3. `npm run ios:sync` and Run / Archive again.

Leave `VITE_PIPELINE_API_URL` **unset** until the host exists. Packaged iOS then stays on the fixture path instead of hanging on Analyzing.

Do **not** point a packaged `https://localhost` bundle at `http://127.0.0.1:5173` via this env (mixed content / ATS). Use **live-reload** (§3) for local API, or HTTPS for a hosted API.

---

## 6. What this path is / is not

| | Packaged Simulator (`ios:sync`) | Live-reload (`ios:live-sync` + `npm run dev`) | GitHub Pages |
| --- | --- | --- | --- |
| Required for this E2E? | **Yes** | Optional (live create) | **No** |
| Chair sample | Yes (bundled) | Yes | Yes (Safari only) |
| Fixture create | Yes | Yes | Yes |
| Live PDF / YouTube | No (until §5) | Yes | No |
| `/api/pipeline` | No | Vite on the Mac | No |

Human session list: [E2E-CHECKLIST.md](E2E-CHECKLIST.md). Web-only Safari preview (not this path): [PHONE-PREVIEW.md](PHONE-PREVIEW.md).
