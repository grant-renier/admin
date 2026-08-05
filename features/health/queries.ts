/**
 * Server-side data access for the service health page.
 *
 * This module owns three things:
 *   1. the Supabase probe (it needs `supabaseAdmin`, which by repo rule may
 *      only be used from a `features/*\/queries.ts`),
 *   2. running every probe CONCURRENTLY and recording the round into
 *      `service_health_checks`,
 *   3. reading measured history back out for the charts and tables.
 *
 * Nothing here fabricates a status. Every number the page shows is either a
 * fresh measurement or a row that was measured earlier.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/client";

import { buildLatencyHistory, buildQueueDepthHistory, toFailureRows } from "./lib/aggregate";
import { probeBridge, probeStripe, probeWeb } from "./lib/probes";
import {
  CONCURRENT_SESSION_CEILING,
  MONITORED_SERVICES,
  SERVICE_LABELS,
  type FailureRow,
  type HealthDatabase,
  type HealthHistory,
  type HealthSnapshot,
  type HealthStatus,
  type LiveSessionLoad,
  type MonitoredService,
  type ProbeOutcome,
  type ServiceHealthCheckRow,
  type ServiceStatusView,
  type UptimeStat,
  type UptimeWindowStat,
} from "./types";

/**
 * `service_health_checks` is not declared in the shared `types/supabase.ts`
 * (that file is owned outside this feature), so rather than fall back to
 * `any` we cast the shared service-role client to the minimal schema slice
 * this feature declares. Delete this once the table lands in `Database`.
 */
const healthDb = supabaseAdmin as unknown as SupabaseClient<HealthDatabase>;

/** Timeout for the Supabase liveness query, mirroring the HTTP probes. */
const SUPABASE_TIMEOUT_MS = 4_000;

/** A trivial indexed lookup slower than this is degraded, not healthy. */
const SUPABASE_SLOW_MS = 1_500;

/** How stale a recorded round may be before a page render records a new one. */
const RECORD_MIN_INTERVAL_SECONDS = 60;

/** Rows pulled for the history charts (PostgREST caps a page at 1000). */
const HISTORY_ROW_LIMIT = 1000;

const HOUR_MS = 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Probes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Times a trivial primary-key-indexed count against Postgres.
 *
 * Lives here rather than in `lib/probes.ts` because it is the one probe that
 * needs the service-role client.
 */
export async function probeSupabase(): Promise<ProbeOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const { error, count } = await supabaseAdmin
      .from("app_config")
      .select("key", { count: "exact", head: true })
      .abortSignal(controller.signal);

    const latencyMs = Date.now() - startedAt;

    if (error) {
      return {
        service: "supabase",
        status: "down",
        latencyMs,
        detail: { reason: error.message, code: error.code ?? null },
      };
    }
    if (latencyMs > SUPABASE_SLOW_MS) {
      return {
        service: "supabase",
        status: "degraded",
        latencyMs,
        detail: {
          reason: `Trivial query took ${latencyMs}ms (> ${SUPABASE_SLOW_MS}ms)`,
          rows: count ?? 0,
        },
      };
    }
    return {
      service: "supabase",
      status: "up",
      latencyMs,
      detail: { rows: count ?? 0 },
    };
  } catch (error) {
    return {
      service: "supabase",
      status: "down",
      latencyMs: Date.now() - startedAt,
      detail: {
        reason: error instanceof Error ? error.message : "Query failed",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe order, kept alongside the runners so results stay attributable. */
const PROBES: ReadonlyArray<{
  service: MonitoredService;
  run: () => Promise<ProbeOutcome>;
}> = [
  { service: "bridge", run: probeBridge },
  { service: "supabase", run: probeSupabase },
  { service: "stripe", run: probeStripe },
  { service: "web", run: probeWeb },
];

/**
 * Runs every probe concurrently.
 *
 * `Promise.allSettled`, never `Promise.all` and never in series: one hanging
 * dependency must not delay the others, and a probe that throws despite its
 * own guards becomes a `down` result rather than a failed page render.
 */
export async function runProbes(): Promise<ProbeOutcome[]> {
  const settled = await Promise.allSettled(PROBES.map((p) => p.run()));

  return settled.map((result, index) => {
    const { service } = PROBES[index];
    if (result.status === "fulfilled") return result.value;
    return {
      service,
      status: "down" as const,
      latencyMs: null,
      detail: {
        reason:
          result.reason instanceof Error
            ? result.reason.message
            : "Probe threw a non-Error value",
      },
    };
  });
}

/**
 * Persists one probe round.
 *
 * `not_configured` outcomes are skipped: the `status` CHECK constraint
 * rejects them, and writing them as `down` would make an absent optional
 * credential look like an outage in every uptime figure.
 *
 * Best-effort by design - if Supabase is the thing that is down, failing to
 * record must not also take out the page that reports it.
 */
async function recordHealthChecks(
  outcomes: ProbeOutcome[],
  checkedAt: string
): Promise<void> {
  const rows = outcomes
    .filter((o) => o.status !== "not_configured")
    .map((o) => ({
      service: o.service,
      status: o.status as HealthStatus,
      latency_ms: o.latencyMs,
      detail: o.detail,
      checked_at: checkedAt,
    }));

  if (rows.length === 0) return;

  const { error } = await healthDb.from("service_health_checks").insert(rows);
  if (error) {
    console.warn("[health] failed to record checks: %s", error.message);
  }
}

/** Decorates raw outcomes with their labels and the round's timestamp. */
function toStatusViews(
  outcomes: ProbeOutcome[],
  checkedAt: string
): ServiceStatusView[] {
  const byService = new Map(outcomes.map((o) => [o.service, o]));
  return MONITORED_SERVICES.map((service) => {
    const outcome = byService.get(service);
    return {
      service,
      label: SERVICE_LABELS[service],
      status: outcome?.status ?? "down",
      latencyMs: outcome?.latencyMs ?? null,
      detail: outcome?.detail ?? { reason: "Probe produced no result" },
      checkedAt,
    };
  });
}

/**
 * Runs every probe and always records the round. Used by the
 * "run checks now" Server Action.
 */
export async function runHealthChecks(): Promise<HealthSnapshot> {
  const checkedAt = new Date().toISOString();
  const outcomes = await runProbes();
  await recordHealthChecks(outcomes, checkedAt);
  return { services: toStatusViews(outcomes, checkedAt), checkedAt, recorded: true };
}

/** Timestamp of the most recent recorded check, or null when none exist. */
async function getLastRecordedAt(): Promise<string | null> {
  const { data } = await healthDb
    .from("service_health_checks")
    .select("checked_at")
    .order("checked_at", { ascending: false })
    .limit(1);
  return data?.[0]?.checked_at ?? null;
}

/**
 * Current status of every dependency.
 *
 * The probes always run, so what the page shows is genuinely current rather
 * than a replay of the last recorded round. Recording, however, is rate
 * limited to one round per `RECORD_MIN_INTERVAL_SECONDS` so that refreshing
 * the page cannot flood the history table (and distort the uptime
 * denominators) with near-duplicate samples.
 */
export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const checkedAt = new Date().toISOString();
  const [lastRecordedAt, outcomes] = await Promise.all([
    getLastRecordedAt(),
    runProbes(),
  ]);

  const ageSeconds =
    lastRecordedAt === null
      ? Number.POSITIVE_INFINITY
      : (Date.now() - new Date(lastRecordedAt).getTime()) / 1000;
  const shouldRecord = ageSeconds >= RECORD_MIN_INTERVAL_SECONDS;

  if (shouldRecord) await recordHealthChecks(outcomes, checkedAt);

  return {
    services: toStatusViews(outcomes, checkedAt),
    checkedAt,
    recorded: shouldRecord,
  };
}

/* ------------------------------------------------------------------ */
/*  Measured history                                                   */
/* ------------------------------------------------------------------ */

/** Counts recorded checks for one service/window, and how many were `up`. */
async function getUptimeWindow(
  service: MonitoredService,
  since: string
): Promise<UptimeWindowStat> {
  const [{ count: total }, { count: up }] = await Promise.all([
    healthDb
      .from("service_health_checks")
      .select("id", { count: "exact", head: true })
      .eq("service", service)
      .gte("checked_at", since),
    healthDb
      .from("service_health_checks")
      .select("id", { count: "exact", head: true })
      .eq("service", service)
      .eq("status", "up")
      .gte("checked_at", since),
  ]);

  const totalCount = total ?? 0;
  const upCount = up ?? 0;
  return {
    total: totalCount,
    up: upCount,
    // Null, never 0 and never 100: with no samples there is no measurement,
    // and inventing one is exactly what this page must not do.
    pct: totalCount === 0 ? null : (upCount / totalCount) * 100,
  };
}

/**
 * Measured availability per service over the last 24 hours and 7 days.
 *
 * Counted server-side with `head: true` count queries so the numbers stay
 * exact no matter how many rows the window holds.
 */
export async function getUptimeStats(): Promise<UptimeStat[]> {
  const now = Date.now();
  const since24h = new Date(now - 24 * HOUR_MS).toISOString();
  const since7d = new Date(now - 7 * 24 * HOUR_MS).toISOString();

  return Promise.all(
    MONITORED_SERVICES.map(async (service) => {
      const [last24h, last7d] = await Promise.all([
        getUptimeWindow(service, since24h),
        getUptimeWindow(service, since7d),
      ]);
      return { service, label: SERVICE_LABELS[service], last24h, last7d };
    })
  );
}

/**
 * Reads the last 24 hours of checks and derives both chart series.
 *
 * Capped at one PostgREST page. When the cap is hit the series covers the
 * most recent rows only, and `truncated` lets the UI say so instead of
 * implying full coverage.
 */
export async function getHealthHistory(hours = 24): Promise<HealthHistory> {
  const since = new Date(Date.now() - hours * HOUR_MS).toISOString();

  const { data } = await healthDb
    .from("service_health_checks")
    .select("id, service, status, latency_ms, detail, checked_at")
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })
    .limit(HISTORY_ROW_LIMIT);

  const rows: ServiceHealthCheckRow[] = data ?? [];

  return {
    latency: buildLatencyHistory(rows),
    queueDepth: buildQueueDepthHistory(rows),
    sampleCount: rows.length,
    truncated: rows.length >= HISTORY_ROW_LIMIT,
  };
}

/** The most recent checks that did not report `up`, newest first. */
export async function getRecentFailures(limit = 20): Promise<FailureRow[]> {
  const { data } = await healthDb
    .from("service_health_checks")
    .select("id, service, status, latency_ms, detail, checked_at")
    .neq("status", "up")
    .order("checked_at", { ascending: false })
    .limit(limit);

  const rows: ServiceHealthCheckRow[] = data ?? [];
  return toFailureRows(rows);
}

/* ------------------------------------------------------------------ */
/*  Capacity                                                           */
/* ------------------------------------------------------------------ */

/**
 * Live sessions currently holding the engine open.
 *
 * Each recording session posts a transcript chunk every 15s into an engine
 * that scores one chunk at a time behind a global lock, so this count read
 * against `CONCURRENT_SESSION_CEILING` is the capacity question the owner is
 * actually asking.
 */
export async function getLiveSessionLoad(): Promise<LiveSessionLoad> {
  const { count } = await supabaseAdmin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "recording");

  const concurrent = count ?? 0;
  return {
    concurrent,
    ceiling: CONCURRENT_SESSION_CEILING,
    ratio: concurrent / CONCURRENT_SESSION_CEILING,
  };
}
