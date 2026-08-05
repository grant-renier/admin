/**
 * Display formatters shared by the health components. Pure and
 * locale-pinned to `en-US` so a server render and a client re-render agree.
 */

/** Renders a measured latency, or an em dash when the probe never ran. */
export function formatLatency(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Renders an absolute timestamp, e.g. `Jul 31, 14:03:22`. */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Renders an hourly chart bucket, e.g. `Jul 31 14:00`. */
export function formatHour(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Renders how long ago something happened, coarsely.
 *
 * @param iso - Timestamp to describe.
 * @param now - Reference point, injectable so this stays pure.
 */
export function formatAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Renders a measured availability percentage, or "no data" when unmeasured. */
export function formatUptimePct(pct: number | null): string {
  return pct === null ? "No data" : `${pct.toFixed(2)}%`;
}
