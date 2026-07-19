import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a raw category (module) slug for display: "executives" ->
 * "Executives", "sales_teams" -> "Sales Teams". Sentinel labels like
 * "Global" are handled by callers before invoking this helper.
 */
export function formatCategoryLabel(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Turn arbitrary text (a post title) into a URL-safe slug: lowercased,
 * accents stripped, non-alphanumerics collapsed to single hyphens, trimmed.
 * Uniqueness is enforced separately at the query layer.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Estimate reading time in whole minutes from a markdown body, assuming an
 * average of 200 words/min. Always returns at least 1 for non-empty content.
 */
export function estimateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}
