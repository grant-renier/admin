/**
 * Single source of truth for the assessment module ("category") slugs used
 * across the admin panel. Mirrors `MODULE_THEMES` in the web repo
 * (`src/themes/modules.ts`) so blog/educational content tags stay consistent
 * with what the client app actually renders. Using a shared constant (and a
 * <Select> bound to it) kills the free-text module typos the old forms allowed.
 */

/** A selectable module option: the stored slug plus its human label. */
export interface ModuleOption {
  slug: string;
  label: string;
}

/**
 * Authoritative, ordered module list. `golf911`..`sports` are the six live
 * assessment modules; `emergency911` and `self-assessment` are pseudo-modules
 * (no purchasable backend template) but are still valid content targets.
 */
export const MODULES: readonly ModuleOption[] = [
  { slug: "golf911", label: "Golf 911" },
  { slug: "executives", label: "Executives" },
  { slug: "dating", label: "Dating" },
  { slug: "politics", label: "Politics" },
  { slug: "markets", label: "Markets" },
  { slug: "sports", label: "Sports" },
  { slug: "emergency911", label: "Emergency 911" },
  { slug: "self-assessment", label: "Self-Assessment" },
] as const;

/** Set of valid slugs for fast membership checks in Zod refinements. */
export const MODULE_SLUGS: readonly string[] = MODULES.map((m) => m.slug);

/** Look up a display label for a slug, falling back to the raw slug. */
export function moduleLabel(slug: string | null | undefined): string {
  if (!slug) return "All";
  return MODULES.find((m) => m.slug === slug)?.label ?? slug;
}
