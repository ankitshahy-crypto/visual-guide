import type { CSSProperties } from "react";
import { loadFont } from "@remotion/google-fonts/AtkinsonHyperlegible";

// Clip components use inline styles only, so they render identically in the
// browser <Player> and in the headless MP4 renderer (Tailwind is chrome-only).
const font = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const T = {
  font: font.fontFamily,
  // Clip stage stays paper-white. Do not invert — letter tags need black-on-white.
  paper: "#ffffff",
  ink: "#000000",
  action: "#f0552b",
  check: "#1e8e5a",
  ash: "#6b6f75",
  rule: "#c9ced4",
  faint: "#f3f4f6",
} as const;

export const box = (extra: CSSProperties = {}): CSSProperties => ({
  border: `3px solid ${T.ink}`,
  background: T.paper,
  ...extra,
});
