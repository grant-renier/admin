import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { describeDetail } from "../lib/aggregate";
import { formatLatency } from "../lib/format";
import { readBridgeDetail } from "../lib/probes";
import type { ServiceStatusView } from "../types";
import { StatusBadge } from "./status-badge";

/** Bridge-only extras: the two numbers that predict overload. */
function BridgeFacts({ service }: { service: ServiceStatusView }) {
  const payload = readBridgeDetail(service.detail);
  if (!payload) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted-foreground">Queue depth</dt>
      <dd className="text-right font-medium tabular-nums">
        {payload.queueDepth}
      </dd>
      <dt className="text-muted-foreground">Engine</dt>
      <dd className="text-right font-medium">
        {payload.engineRunning ? "Running" : "Idle"}
      </dd>
      {payload.uptime && (
        <>
          <dt className="text-muted-foreground">Bridge uptime</dt>
          <dd className="text-right font-medium">{payload.uptime}</dd>
        </>
      )}
      {payload.bridgeVersion && (
        <>
          <dt className="text-muted-foreground">Version</dt>
          <dd className="text-right font-medium">{payload.bridgeVersion}</dd>
        </>
      )}
    </dl>
  );
}

/** One dependency: status, measured latency, and whatever detail it returned. */
function ServiceCard({ service }: { service: ServiceStatusView }) {
  // A healthy probe's detail is bookkeeping (row counts, HTTP 200). Only
  // show it when something is wrong and it is the actual diagnosis.
  const detail = service.status === "up" ? "-" : describeDetail(service.detail);
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{service.label}</CardTitle>
            <CardDescription className="tabular-nums">
              {service.status === "not_configured"
                ? "No probe run"
                : `Responded in ${formatLatency(service.latencyMs)}`}
            </CardDescription>
          </div>
          <StatusBadge status={service.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {service.service === "bridge" && <BridgeFacts service={service} />}
        {detail !== "-" && (
          <p className="text-xs text-muted-foreground break-words">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Current status of every probed dependency.
 *
 * Each card reflects a probe run during this request, not a replay of the
 * last recorded row - so "up" here means up now.
 */
export function ServiceStatusCards({
  services,
}: {
  services: ServiceStatusView[];
}) {
  return (
    <div className="grid gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {services.map((service) => (
        <ServiceCard key={service.service} service={service} />
      ))}
    </div>
  );
}
