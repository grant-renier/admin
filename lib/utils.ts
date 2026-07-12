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
