/** Files in `public/` must honor Vite `base` (./ locally / Capacitor, /visual-guide/ on GitHub Pages). */
export function publicUrl(file: string): string {
  if (/^(data:|blob:|https?:\/\/)/.test(file)) return file;
  const rel = file.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "./";
  if (base === "./" || base === ".") return `./${rel}`;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${rel}`;
}
