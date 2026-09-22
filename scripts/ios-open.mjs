#!/usr/bin/env node
/**
 * Open ios/App/App.xcodeproj via Capacitor. Fails before `cap open` if the
 * synced web bundle is missing (clone → open without ios:sync).
 */
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexHtml = resolve(root, "ios/App/App/public/index.html");

if (!existsSync(indexHtml)) {
  console.error("ios/App/App/public/index.html missing.");
  console.error("On a Mac, from the repo root:");
  console.error("  npm install");
  console.error("  npm run ios:sync");
  console.error("  npm run ios:open");
  console.error("See docs/IOS-DEPLOY.md. GitHub Pages is not required.");
  process.exit(1);
}

const child = spawn("npx", ["cap", "open", "ios"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 1));
