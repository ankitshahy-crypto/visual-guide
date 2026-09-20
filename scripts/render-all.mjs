// Renders every step of the golden guide to out/<stepId>.mp4 (and a simple-narration variant).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const guide = JSON.parse(readFileSync("src/data/golden/newtral-magich-pro.json", "utf8"));
mkdirSync("out", { recursive: true });

for (const step of guide.steps) {
  for (const level of ["standard", "simple"]) {
    const out = `out/${step.id}-${level}.mp4`;
    const props = JSON.stringify({ step, guide, level });
    const r = spawnSync("npx", ["remotion", "render", "src/remotion/index.ts", `clip-${step.id}`, out, `--props=${props}`], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
