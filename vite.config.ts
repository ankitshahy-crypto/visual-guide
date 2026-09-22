import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Connect } from "vite";
import { handlePipelineApi } from "./src/pipeline/devApi";

const capacitorIos = process.env.CAPACITOR_IOS_BUILD === "1";

function viteBase(): string {
  // iOS sync must not inherit a Pages VITE_BASE=/visual-guide/ shell value.
  // That prefix 404s every module script inside the WKWebView and the phone stays dark.
  if (capacitorIos) return "./";
  const raw = process.env.VITE_BASE?.trim();
  if (!raw) return "./";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

if (capacitorIos && process.env.VITE_BASE?.trim()) {
  console.warn(
    "vite: CAPACITOR_IOS_BUILD ignores VITE_BASE so the WKWebView loads ./assets/ instead of /visual-guide/.",
  );
}

const pagesBase = capacitorIos || !process.env.VITE_BASE?.trim()
  ? undefined
  : viteBase();

function stripAssetCrossorigin() {
  return {
    name: "plainstep-capacitor-crossorigin",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      if (process.env.CAPACITOR_IOS_BUILD !== "1") return html;
      const strip = (tag: string) => tag.replace(/\s+crossorigin(?:="[^"]*")?/g, "");
      return html
        .replace(/<script\b[^>]*>/g, strip)
        .replace(/<link\b[^>]*href="[^"]*assets\/[^"]*"[^>]*>/g, strip);
    },
  };
}

const spaFallbackHtml = {
  name: "visual-guide-spa-404",
  closeBundle() {
    const index = resolve(import.meta.dirname, "dist/index.html");
    try {
      copyFileSync(index, resolve(import.meta.dirname, "dist/404.html"));
    } catch {
      // preview / tests may not write dist/
    }
  },
};

const pipelineApi = {
  name: "visual-guide-pipeline-api",
  configureServer(server: { middlewares: Connect.Server }) {
    server.middlewares.use((req, res, next) => {
      void handlePipelineApi(req, res).then((handled) => {
        if (!handled) next();
      }).catch(next);
    });
  },
  configurePreviewServer(server: { middlewares: Connect.Server }) {
    server.middlewares.use((req, res, next) => {
      void handlePipelineApi(req, res).then((handled) => {
        if (!handled) next();
      }).catch(next);
    });
  },
};

export default defineConfig({
  // ./ for Capacitor + Vercel at domain root. Pages CI sets VITE_BASE=/visual-guide/.
  base: pagesBase ?? "./",
  plugins: [
    react(),
    tailwindcss(),
    pipelineApi,
    spaFallbackHtml,
    stripAssetCrossorigin(),
  ],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
