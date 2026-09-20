import { publicUrl } from "./publicUrl";

/** Resolve SourcePage.image to a path the player / Remotion can load. */
export function pageImagePath(image: string): string {
  if (/^(data:|blob:|https?:\/\/)/.test(image)) return image;
  const trimmed = image.replace(/^\//, "");
  if (trimmed.startsWith("golden/") || trimmed.startsWith("projects/")) return trimmed;
  return `golden/${trimmed}`;
}

export function pageImageUrl(image: string): string {
  const path = pageImagePath(image);
  if (/^(data:|blob:|https?:\/\/)/.test(path)) return path;
  return publicUrl(path);
}

export function isInlineImage(src: string): boolean {
  return /^(data:|blob:|https?:\/\/)/.test(src);
}
