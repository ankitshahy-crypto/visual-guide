import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handlePipelineApi } from "./src/pipeline/devApi";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "visual-guide-pipeline-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          void handlePipelineApi(req, res).then((handled) => {
            if (!handled) next();
          }).catch(next);
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
