#!/usr/bin/env node
/**
 * Assert a production `dist/` built with VITE_BASE=/visual-guide/ will load
 * JS chunks and workers from /visual-guide/assets/ — not bare /assets/.
 * Analyzing used to throw Safari's "Importing a module script failed."
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const errors = [];

function fail(msg) {
  errors.push(msg);
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("check-pages-chunks: dist/index.html missing. Run VITE_BASE=/visual-guide/ npm run build first.");
  process.exit(1);
}

const html = readFileSync(join(dist, "index.html"), "utf8");
if (!html.includes('src="/visual-guide/assets/')) {
  fail("index.html module script is not under /visual-guide/assets/");
}
if (/"\/assets\//.test(html) && !html.includes("/visual-guide/assets/")) {
  fail("index.html still has a bare /assets/ URL");
}

const assetDir = join(dist, "assets");
if (!existsSync(assetDir)) {
  fail("dist/assets/ missing");
} else {
  const files = readdirSync(assetDir).filter((f) => /\.(js|mjs|css)$/.test(f));
  const forbiddenDynamic = [
    'import("jpeg-js")',
    "import('jpeg-js')",
    'import("pdfjs-dist")',
    "import('pdfjs-dist')",
    'import("./pdfPages',
    "import('./pdfPages",
  ];
  for (const name of files) {
    const text = readFileSync(join(assetDir, name), "utf8");
    for (const needle of forbiddenDynamic) {
      if (text.includes(needle)) {
        fail(`${name} still dynamically imports ${needle} (Safari Pages: Importing a module script failed.)`);
      }
    }
    let i = 0;
    while (i < text.length) {
      const abs = text.indexOf('"/assets/', i);
      const abs2 = text.indexOf("'/assets/", i);
      const hit = [abs, abs2].filter((n) => n >= 0).sort((a, b) => a - b)[0];
      if (hit == null) break;
      const window = text.slice(Math.max(0, hit - 16), hit + 24);
      if (!window.includes("/visual-guide/assets/")) {
        fail(`${name} has an unprefixed /assets/ URL: ${window.replace(/\s+/g, " ")}`);
      }
      i = hit + 8;
    }
  }
}

if (errors.length) {
  console.error("check-pages-chunks failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("check-pages-chunks: /visual-guide/ chunk URLs and static analyzing imports OK");
