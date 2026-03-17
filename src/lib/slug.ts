export function generateSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export function ensureUniqueSlug(
  existingSlugs: string[],
  businessName: string,
  currentSlug?: string
): string {
  const baseSlug = generateSlug(businessName);
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug) && slug !== currentSlug) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export function buildOwnerScopedUrl(
  baseUrl: string,
  slug: string,
  path: string
): string {
  return `${baseUrl}/${slug}${path}`;
}

export function parseOwnerScopedUrl(url: string): { slug: string; path: string } | null {
  const match = url.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  return {
    slug: match[1],
    path: match[2] || '',
  };
}
