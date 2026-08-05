/**
 * Pure aggregation helpers that turn raw `service_health_checks` rows into
 * the series the charts and tables render. No React, no Supabase - one
 * database read in `queries.ts` feeds all of these.
 */

import { readBridgeDetail } from "./probes";
import {
  MONITORED_SERVICES,
  type FailureRow,
  type LatencyPoint,
  type MonitoredService,
  type ProbeDetail,
  type QueueDepthPoint,
  type ServiceHealthCheckRow,
} from "../types";

/** Truncates a timestamp to its UTC hour, e.g. `2026-07-31T14:00:00Z`. */
export function hourBucket(iso: string): string {
  const d = new Date(iso);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/** Narrows an arbitrary row `service` to the set this page charts. */
function isMonitored(service: string): service is MonitoredService {
  return (MONITORED_SERVICES as readonly string[]).includes(service);
}

/**
 * Averages latency per service into hourly buckets.
 *
 * A service with no sample in a bucket gets `null`, not `0`: recharts skips
 * nulls, so a gap in the line reads as "not sampled" rather than as a
 * suspiciously instant response.
 */
export function buildLatencyHistory(
  rows: ServiceHealthCheckRow[]
): LatencyPoint[] {
  const buckets = new Map<
    string,
    Map<MonitoredService, { sum: number; count: number }>
  >();

  for (const row of rows) {
    if (row.latency_ms === null || !isMonitored(row.service)) continue;
    const key = hourBucket(row.checked_at);
    const byService =
      buckets.get(key) ?? new Map<MonitoredService, { sum: number; count: number }>();
    const entry = byService.get(row.service) ?? { sum: 0, count: 0 };
    entry.sum += row.latency_ms;
    entry.count += 1;
    byService.set(row.service, entry);
    buckets.set(key, byService);
  }

  const average = (
    byService: Map<MonitoredService, { sum: number; count: number }>,
    service: MonitoredService
  ): number | null => {
    const entry = byService.get(service);
    return entry ? Math.round(entry.sum / entry.count) : null;
  };

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, byService]) => ({
      bucket,
      bridge: average(byService, "bridge"),
      supabase: average(byService, "supabase"),
      stripe: average(byService, "stripe"),
      web: average(byService, "web"),
    }));
}

/**
 * Extracts bridge queue depth per hourly bucket.
 *
 * Both the average and the peak are kept: an average of 1 hides a spike to
 * 12, and the spike is what tells the owner the engine fell behind.
 */
export function buildQueueDepthHistory(
  rows: ServiceHealthCheckRow[]
): QueueDepthPoint[] {
  const buckets = new Map<string, { sum: number; count: number; max: number }>();

  for (const row of rows) {
    if (row.service !== "bridge") continue;
    const payload = readBridgeDetail(row.detail);
    if (!payload) continue;
    const key = hourBucket(row.checked_at);
    const entry = buckets.get(key) ?? { sum: 0, count: 0, max: 0 };
    entry.sum += payload.queueDepth;
    entry.count += 1;
    entry.max = Math.max(entry.max, payload.queueDepth);
    buckets.set(key, entry);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, entry]) => ({
      bucket,
      avgQueueDepth: Math.round((entry.sum / entry.count) * 100) / 100,
      maxQueueDepth: entry.max,
    }));
}

/**
 * Flattens a `detail` jsonb blob into one readable line.
 *
 * Probes write a `reason` string (or a `reasons` array for the bridge, which
 * can fail several checks at once); anything else falls back to compact JSON
 * so an unexpected shape is still visible to the operator.
 */
export function describeDetail(detail: ProbeDetail | null): string {
  if (!detail) return "-";
  if (Array.isArray(detail.reasons) && detail.reasons.length > 0) {
    return detail.reasons.filter((r) => typeof r === "string").join(" · ");
  }
  if (typeof detail.reason === "string" && detail.reason.length > 0) {
    return detail.reason;
  }
  const json = JSON.stringify(detail);
  if (!json || json === "{}") return "-";
  return json.length > 240 ? `${json.slice(0, 240)}…` : json;
}

/** Maps raw non-`up` rows to the shape the failures table renders. */
export function toFailureRows(rows: ServiceHealthCheckRow[]): FailureRow[] {
  return rows.map((row) => ({
    id: row.id,
    service: row.service,
    status: row.status,
    latencyMs: row.latency_ms,
    checkedAt: row.checked_at,
    detail: describeDetail(row.detail),
  }));
}
