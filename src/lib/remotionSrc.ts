import { publicUrl } from "./publicUrl";

/**
 * Resolve a `public/` file for Remotion <Img> / <Audio> under Vite `base`.
 * Remotion `staticFile()` falls back to `/file` when `window.remotion_staticBase`
 * is unset (the Vite player). That 404s on project GitHub Pages (`/visual-guide/`).
 */
export function remotionPublicSrc(src: string): string {
  if (/^(data:|blob:|https?:\/\/)/i.test(src)) return src;
  const base = import.meta.env.BASE_URL || "./";
  const prefix = base === "./" || base === "." ? "./" : base.endsWith("/") ? base : `${base}/`;
  if (src.startsWith(prefix) || src.startsWith(base)) return src;
  return publicUrl(src.replace(/^\//, ""));
}
