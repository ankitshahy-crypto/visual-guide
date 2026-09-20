import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root,
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, watch: { ignored: ["**/**"] } },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const mod = await server.ssrLoadModule("/src/pipeline/cliNarrate.ts");
  await mod.main();
} finally {
  try {
    await server.close();
  } catch {
    // Vite may still be flushing a dep scan; generation already finished.
  }
}
