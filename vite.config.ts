import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Connect } from "vite";
import { handlePipelineApi } from "./src/pipeline/devApi";

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
  ],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
