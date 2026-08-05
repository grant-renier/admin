import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityIcon, CpuIcon, LayersIcon } from "lucide-react";

import { formatAgo, formatTimestamp } from "../lib/format";
import { readBridgeDetail } from "../lib/probes";
import {
  CAPACITY_WARN_RATIO,
  CHUNK_WINDOW_SECONDS,
  ENGINE_SECONDS_PER_CHUNK_ESTIMATE,
  type LiveSessionLoad,
  type ServiceStatusView,
} from "../types";
import { CapacityAlerts } from "./capacity-alerts";
import { CapacityStat } from "./capacity-stat";

interface CapacityPanelProps {
  load: LiveSessionLoad;
  bridge: ServiceStatusView;
}

/**
 * The operational reality panel: live sessions against the engine's
 * serialized capacity, next to the bridge's queue depth.
 *
 * The .NET engine scores one chunk at a time behind a global lock, so
 * sustained capacity is (chunk window / engine seconds per chunk). Queue
 * depth is the leading indicator - it climbs before latency or failures do.
 */
export function CapacityPanel({ load, bridge }: CapacityPanelProps) {
  const payload = readBridgeDetail(bridge.detail);
  const warnAt = Math.ceil(load.ceiling * CAPACITY_WARN_RATIO);
  const atCeiling = load.concurrent >= load.ceiling;
  const approaching = !atCeiling && load.concurrent >= warnAt;
  const barPct = Math.min(100, Math.round(load.ratio * 100));

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Engine capacity</CardTitle>
        <CardDescription>
          The .NET engine is serialized behind one global lock. Every live
          session posts a chunk every {CHUNK_WINDOW_SECONDS}s, so sustained
          capacity is about {CHUNK_WINDOW_SECONDS}s ÷{" "}
          {ENGINE_SECONDS_PER_CHUNK_ESTIMATE}s ≈ {load.ceiling} concurrent
          sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <CapacityStat
            label="Live sessions now"
            value={`${load.concurrent} / ${load.ceiling}`}
            hint="Sessions with status 'recording'"
            icon={ActivityIcon}
            tone={atCeiling ? "critical" : approaching ? "warn" : "default"}
          />
          <CapacityStat
            label="Bridge queue depth"
            value={payload ? String(payload.queueDepth) : "-"}
            hint={
              payload
                ? "Chunks waiting on the engine lock"
                : "Bridge /health unreachable"
            }
            icon={LayersIcon}
            tone={
              payload && payload.queueDepth >= load.ceiling
                ? "critical"
                : payload && payload.queueDepth > 0
                  ? "warn"
                  : "default"
            }
          />
          <CapacityStat
            label="Engine"
            value={payload ? (payload.engineRunning ? "Running" : "Idle") : "-"}
            hint={
              payload?.lastEngineRun
                ? `Last run ${formatAgo(payload.lastEngineRun)} · ${formatTimestamp(payload.lastEngineRun)}`
                : payload
                  ? "No engine run reported yet"
                  : "Bridge /health unreachable"
            }
            icon={CpuIcon}
            tone={
              payload && payload.queueDepth > 0 && !payload.engineRunning
                ? "critical"
                : "default"
            }
          />
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                atCeiling
                  ? "bg-destructive"
                  : approaching
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {load.concurrent} of an estimated {load.ceiling} sustainable
            concurrent live sessions ({barPct}% of the ceiling)
          </p>
        </div>

        <CapacityAlerts load={load} bridge={payload} warnAt={warnAt} />

        <p className="text-xs text-muted-foreground">
          The {ENGINE_SECONDS_PER_CHUNK_ESTIMATE}s per-chunk engine time is an{" "}
          <strong>estimate</strong> - the bridge does not report per-chunk
          timing yet, so the ceiling derived from it is an estimate too. Live
          session count, queue depth, latency and uptime on this page are all
          measured.
        </p>
      </CardContent>
    </Card>
  );
}
