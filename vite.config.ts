import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Connect } from "vite";
import { handlePipelineApi } from "./src/pipeline/devApi";

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
  // Relative asset URLs so the Capacitor iOS bundle loads from the local origin.
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    pipelineApi,
    spaFallbackHtml,
  ],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
