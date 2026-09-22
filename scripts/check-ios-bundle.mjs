#!/usr/bin/env node
/**
 * Post-`cap sync` checks so a Mac clone fails loudly before Xcode.
 * Linux CI can run this after `npm run ios:sync` (no Xcode required).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "ios/App/App/public");
const indexHtml = resolve(publicDir, "index.html");
const capJson = resolve(root, "ios/App/App/capacitor.config.json");
const required = [
  "fixtures/parts-list.jpg",
  "fixtures/assembly-steps.jpg",
  "golden/pages/p-01.jpg",
  "golden/realistic/steps/s1.jpg",
  "golden/realistic/parts/D.jpg",
  "icons/plainstep-app-icon.png",
];

const fail = (msg) => {
  console.error(`ios bundle: ${msg}`);
  process.exit(1);
};

if (!existsSync(indexHtml)) {
  fail("ios/App/App/public/index.html missing. Run: npm run ios:sync");
}

const html = readFileSync(indexHtml, "utf8");
if (!html.includes("Plainstep")) {
  fail("bundled index.html is not Plainstep");
}
if (html.includes("/visual-guide/")) {
  fail("bundle was built with GitHub Pages base /visual-guide/. Unset VITE_BASE and rebuild (Pages is not used for iOS). npm run ios:sync forces base ./.");
}
if (!html.includes('src="./assets/')) {
  fail('bundled index.html has no relative src="./assets/…" script. The WKWebView home stays blank. Rebuild with npm run ios:sync (CAPACITOR_IOS_BUILD=1).');
}
if (/(?:src|href)="\/assets\//.test(html)) {
  fail('bundled index.html uses absolute /assets/ paths. Capacitor needs ./assets/.');
}
if (/<script\b[^>]*\scrossorigin\b/.test(html)) {
  fail("bundled index.html still marks module scripts crossorigin. Rebuild with npm run ios:sync.");
}
if (!html.includes('id="plainstep-boot"')) {
  fail("bundled index.html is missing the visible boot fallback (plainstep-boot).");
}
const assetRefs = [
  ...html.matchAll(/(?:src|href)="(\.?\/?(?:assets\/[^"]+))"/g),
].map((match) => match[1].replace(/^\.\//, "").replace(/^\//, ""));
const jsAssets = assetRefs.filter((rel) => rel.endsWith(".js"));
if (jsAssets.length === 0) {
  fail("bundled index.html has no Vite JS asset — the WKWebView home would be blank");
}
for (const rel of assetRefs) {
  if (!existsSync(resolve(publicDir, rel))) {
    fail(`index.html references ${rel} but that file is missing from ios/App/App/public`);
  }
}

for (const rel of required) {
  if (!existsSync(resolve(publicDir, rel))) {
    fail(`missing ${rel} in ios/App/App/public — chair / fixture will 404 in Simulator`);
  }
}

for (const pkg of ["@capacitor/ios", "@capacitor/core", "@capacitor/app", "@capacitor/status-bar"]) {
  if (!existsSync(resolve(root, "node_modules", pkg))) {
    fail(`node_modules/${pkg} missing. Run: npm install (Xcode SPM path deps need this)`);
  }
}

if (!existsSync(capJson)) {
  fail("ios/App/App/capacitor.config.json missing — cap sync did not finish");
}

const cfg = JSON.parse(readFileSync(capJson, "utf8"));
if (cfg.appId !== "app.plainstep.ios") {
  fail(`capacitor appId is ${cfg.appId}, expected app.plainstep.ios`);
}
if (cfg.appName !== "Plainstep") {
  fail(`capacitor appName is ${cfg.appName}, expected Plainstep`);
}
if (cfg.webDir !== "dist") {
  fail(`webDir is ${cfg.webDir}, expected dist`);
}

if (cfg.server?.url) {
  let host = "";
  try {
    host = new URL(cfg.server.url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (loopback) {
    console.warn(
      `ios bundle: live-reload is ${cfg.server.url}. A physical iPhone cannot open localhost (that host is the phone). The iOS shell ignores this URL on device and loads bundled public/. Simulator can still use it. For device live-reload, set CAPACITOR_LIVE_RELOAD to the Mac LAN IP.`,
    );
  } else {
    console.warn(
      `ios bundle: live-reload URL is set (${cfg.server.url}). The app loads that host, not only the packaged dist/. Unset CAPACITOR_LIVE_RELOAD and re-run npm run ios:sync for a device / TestFlight / offline fixture.`,
    );
  }
} else {
  console.log("ios bundle: packaged dist/ (no live-reload). Chair + fixture work offline. No GitHub Pages.");
}

const gitkeep = resolve(publicDir, ".gitkeep");
if (!existsSync(gitkeep)) {
  writeFileSync(
    gitkeep,
    "# Placeholder so Xcode's `public` folder reference exists after clone.\n# `npm run ios:sync` replaces this directory with Vite `dist/` (gitignored).\n",
  );
}

console.log("ios bundle: ok");
