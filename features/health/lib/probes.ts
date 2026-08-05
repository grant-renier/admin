/**
 * Outbound dependency probes.
 *
 * Pure network code: no React, no Supabase, no Next APIs - so it stays
 * testable and so `queries.ts` remains the only module touching
 * `supabaseAdmin` (the Supabase probe lives there for that reason).
 *
 * Every probe here obeys three rules:
 *   1. It has its own timeout. One hanging dependency must never hang the
 *      health page.
 *   2. It never throws. A thrown error is a `down` result with the reason
 *      recorded, not a crashed render.
 *   3. A dependency with no credentials configured reports `not_configured`,
 *      never `down` - see ProbeStatus in ../types.
 */

import {
  CONCURRENT_SESSION_CEILING,
  type BridgeHealthPayload,
  type ProbeDetail,
  type ProbeOutcome,
} from "../types";

/** Per-probe timeout. Short enough that four probes cannot stall a render. */
const PROBE_TIMEOUT_MS = 4_000;

/** Outcome of a single timed HTTP request. */
interface TimedResponse {
  response: Response | null;
  latencyMs: number;
  /** Failure reason when `response` is null. */
  error: string | null;
  timedOut: boolean;
}

/**
 * Performs one HTTP request under a hard timeout, measuring round-trip time.
 *
 * Uses an explicit AbortController rather than `AbortSignal.timeout` so the
 * timer can be cleared on the fast path and so a timeout is distinguishable
 * from a connection error in the recorded detail.
 */
async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<TimedResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      // An ops console must never be served a cached liveness answer.
      cache: "no-store",
    });
    return {
      response,
      latencyMs: Date.now() - startedAt,
      error: null,
      timedOut: false,
    };
  } catch (error) {
    return {
      response: null,
      latencyMs: Date.now() - startedAt,
      error: timedOut
        ? `No response within ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Request failed",
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads a JSON body under its own hard deadline.
 *
 * WHY this exists: `timedFetch` clears its abort timer as soon as the RESPONSE
 * resolves, which happens when the headers arrive - not when the body does. A
 * dependency that answers `200 OK` and then stalls the body stream would hang
 * `await response.json()` forever and, with it, every render of the health
 * page. The deadline here covers the second half of the round trip; cancelling
 * the stream releases the socket and lets the read settle.
 *
 * @returns the parsed body, or null on timeout, cancellation or bad JSON.
 */
async function readJsonWithin(
  response: Response,
  timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      response.json() as Promise<unknown>,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          void response.body?.cancel().catch(() => undefined);
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Strips a trailing slash so `${base}/health` never doubles up. */
function normaliseOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Shorthand for the `not_configured` outcome shape. */
function notConfigured(
  service: ProbeOutcome["service"],
  reason: string
): ProbeOutcome {
  return {
    service,
    status: "not_configured",
    latencyMs: null,
    detail: { reason },
  };
}

/* ------------------------------------------------------------------ */
/*  Bridge                                                             */
/* ------------------------------------------------------------------ */

/**
 * Validates an unknown JSON body as a bridge `/health` payload.
 *
 * The body arrives untyped both from the network and from the `detail` jsonb
 * column, so it is narrowed once here instead of being cast at each use.
 *
 * @returns the payload, or null when the shape is unrecognised.
 */
export function readBridgePayload(value: unknown): BridgeHealthPayload | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.queueDepth !== "number" ||
    typeof raw.engineRunning !== "boolean"
  ) {
    return null;
  }
  return {
    status: typeof raw.status === "string" ? raw.status : "unknown",
    queueDepth: raw.queueDepth,
    uptime: typeof raw.uptime === "string" ? raw.uptime : "",
    lastEngineRun:
      typeof raw.lastEngineRun === "string" ? raw.lastEngineRun : null,
    engineRunning: raw.engineRunning,
    bridgeVersion:
      typeof raw.bridgeVersion === "string" ? raw.bridgeVersion : "",
  };
}

/** Pulls the bridge payload back out of a persisted `detail` jsonb value. */
export function readBridgeDetail(
  detail: ProbeDetail | null
): BridgeHealthPayload | null {
  if (!detail) return null;
  return readBridgePayload(detail.bridge);
}

/**
 * Probes the bridge's `GET /health`.
 *
 * Queue depth is the leading indicator of overload on this system: the .NET
 * engine is serialized behind one global lock, so a depth at or above the
 * sustained concurrency ceiling means chunks are already arriving faster
 * than they can be scored.
 *
 * `engineRunning === false` on its own is NOT a fault - it just means the
 * engine is idle. It is only a symptom when work is queued behind it, which
 * is the signature of a stuck global lock.
 */
export async function probeBridge(): Promise<ProbeOutcome> {
  const base =
    process.env.INTUALITY_BRIDGE_URL ??
    process.env.NEXT_PUBLIC_INTUALITY_BRIDGE_URL ??
    "";
  if (!base) {
    return notConfigured("bridge", "INTUALITY_BRIDGE_URL is not set");
  }

  const apiKey = process.env.INTUALITY_API_KEY ?? "";
  const url = `${normaliseOrigin(base)}/health`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const { response, latencyMs, error, timedOut } = await timedFetch(url, {
    method: "GET",
    headers,
  });

  if (!response) {
    return {
      service: "bridge",
      status: "down",
      latencyMs,
      detail: { reason: error, timedOut, url },
    };
  }

  if (!response.ok) {
    return {
      service: "bridge",
      status: "down",
      latencyMs,
      detail: {
        reason: `HTTP ${response.status} from /health`,
        httpStatus: response.status,
        apiKeyPresent: Boolean(apiKey),
      },
    };
  }

  const body: unknown = await readJsonWithin(response);
  const payload = readBridgePayload(body);
  if (!payload) {
    return {
      service: "bridge",
      status: "degraded",
      latencyMs,
      detail: { reason: "/health returned an unrecognised payload" },
    };
  }

  const reasons: string[] = [];
  if (payload.status && !/^(ok|healthy|up)$/i.test(payload.status)) {
    reasons.push(`Bridge reports status "${payload.status}"`);
  }
  if (payload.queueDepth > 0 && !payload.engineRunning) {
    reasons.push(
      `${payload.queueDepth} chunk(s) queued but the engine reports idle - the global engine lock may be stuck`
    );
  }
  if (payload.queueDepth >= CONCURRENT_SESSION_CEILING) {
    reasons.push(
      `Queue depth ${payload.queueDepth} is at or above the sustained ceiling of ${CONCURRENT_SESSION_CEILING}`
    );
  }

  return {
    service: "bridge",
    status: reasons.length > 0 ? "degraded" : "up",
    latencyMs,
    // The whole payload is persisted so queue depth can be charted over time.
    detail: { bridge: payload, reasons },
  };
}

/* ------------------------------------------------------------------ */
/*  Stripe                                                             */
/* ------------------------------------------------------------------ */

/**
 * Probes the Stripe API with a read-only `GET /v1/balance`.
 *
 * Reports `not_configured` - never `down` - when no secret key is present,
 * because most environments of this panel legitimately run without one.
 */
export async function probeStripe(): Promise<ProbeOutcome> {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) {
    return notConfigured("stripe", "STRIPE_SECRET_KEY is not set");
  }

  const { response, latencyMs, error, timedOut } = await timedFetch(
    "https://api.stripe.com/v1/balance",
    { method: "GET", headers: { authorization: `Bearer ${key}` } }
  );

  if (!response) {
    return {
      service: "stripe",
      status: "down",
      latencyMs,
      detail: { reason: error, timedOut },
    };
  }
  if (response.ok) {
    return { service: "stripe", status: "up", latencyMs, detail: {} };
  }
  // 429 is throttling, not an outage - billing still works, just slower.
  return {
    service: "stripe",
    status: response.status === 429 ? "degraded" : "down",
    latencyMs,
    detail: {
      reason:
        response.status === 401 || response.status === 403
          ? `HTTP ${response.status} - the configured STRIPE_SECRET_KEY was rejected`
          : `HTTP ${response.status} from /v1/balance`,
      httpStatus: response.status,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Public web app                                                     */
/* ------------------------------------------------------------------ */

/**
 * Probes the public site's origin, if one is configured.
 *
 * Redirects are followed rather than left opaque: undici surfaces a
 * `redirect: "manual"` response as status 0, which would be recorded as a
 * meaningless HTTP status. Following the hop also measures what a real
 * visitor actually waits for. GET rather than HEAD - a Next.js route need
 * not implement HEAD, and a 405 there is not an outage.
 */
export async function probeWeb(): Promise<ProbeOutcome> {
  const origin =
    process.env.WEB_APP_URL ??
    process.env.NEXT_PUBLIC_WEB_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "";
  if (!origin) {
    return notConfigured("web", "WEB_APP_URL is not set");
  }

  const url = normaliseOrigin(origin);
  const { response, latencyMs, error, timedOut } = await timedFetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { accept: "text/html" },
  });

  if (!response) {
    return {
      service: "web",
      status: "down",
      latencyMs,
      detail: { reason: error, timedOut, url },
    };
  }
  if (response.status < 400) {
    return {
      service: "web",
      status: "up",
      latencyMs,
      detail: { httpStatus: response.status, url },
    };
  }
  return {
    service: "web",
    status: response.status >= 500 ? "down" : "degraded",
    latencyMs,
    detail: { reason: `HTTP ${response.status}`, httpStatus: response.status, url },
  };
}
