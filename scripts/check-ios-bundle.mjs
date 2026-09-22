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
if (html.includes("/visual-guide/assets/")) {
  fail("bundle was built with GitHub Pages base /visual-guide/. Unset VITE_BASE and rebuild (Pages is not used for iOS).");
}
if (!html.includes("./assets/") && !html.includes("assets/")) {
  fail("bundled index.html has no Vite assets — the WKWebView would be a blank shell");
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
  console.warn(
    `ios bundle: live-reload URL is set (${cfg.server.url}). Simulator will load that host, not the packaged dist/. Unset CAPACITOR_LIVE_RELOAD and re-run npm run ios:sync for TestFlight / offline fixture.`,
  );
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
