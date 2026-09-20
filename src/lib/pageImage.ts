/** Resolve SourcePage.image to a path under /public. Golden files live in public/golden/. */
export function pageImagePath(image: string): string {
  const trimmed = image.replace(/^\//, "");
  if (trimmed.startsWith("golden/") || /^https?:\/\//.test(trimmed)) return trimmed;
  return `golden/${trimmed}`;
}

export function pageImageUrl(image: string): string {
  const path = pageImagePath(image);
  if (/^https?:\/\//.test(path)) return path;
  return `/${path}`;
}
