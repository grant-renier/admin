/**
 * Timestamp formatting for the legal screens.
 *
 * Fixed locale AND fixed time zone: these strings are rendered by client
 * components that also render on the server, so anything locale- or
 * TZ-dependent produces a hydration mismatch. UTC is also the honest reading
 * of an audit trail - "when the row changed", not "when it changed where the
 * viewer happens to be sitting" - which is why the suffix is shown.
 */

/** Shared date+time formatter, pinned to en-US/UTC for determinism. */
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Shared date-only formatter (effective dates are plain `date` columns). */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Format an ISO timestamp as `Jul 9, 2026, 14:03 UTC`.
 *
 * @param iso - ISO timestamp, or null/undefined for an unset column.
 * @returns The formatted string, or an em dash when there is nothing to show.
 */
export function formatLegalTimestamp(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${dateTimeFormatter.format(date)} UTC`;
}

/**
 * Format a `date` column (`YYYY-MM-DD`) as `Jul 9, 2026`.
 *
 * Parsed as UTC midnight rather than local: a bare date string is otherwise
 * interpreted in the viewer's zone and can render as the previous day.
 *
 * @param value - The date string, or null when unset.
 */
export function formatLegalDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}
