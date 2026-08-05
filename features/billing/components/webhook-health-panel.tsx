import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  WebhookIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

import type { WebhookEventSummary, WebhookHealth } from "../types";
import { RefreshBillingButton } from "./refresh-billing-button";

/**
 * Stripe webhook health - the most operationally important panel on the page.
 *
 * A failed event (`processed_at IS NULL AND error IS NOT NULL`) means Stripe
 * charged a customer and this system never applied what they bought: they are
 * out of pocket and still blocked, and nobody finds out until they write in.
 * Failures are therefore pinned to the top of the feed and given their own
 * count tile, rather than being left to sort chronologically where a normal
 * day's traffic buries them.
 *
 * @module features/billing/components/webhook-health-panel
 */

/** Absolute timestamp - support pastes these into Stripe, so no "2h ago". */
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventRow({ event }: { event: WebhookEventSummary }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-3 ${
        event.failed
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {event.failed ? (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive"
          >
            <AlertTriangleIcon className="size-3" />
            Failed
          </Badge>
        ) : event.pending ? (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-600"
          >
            <ClockIcon className="size-3" />
            Pending
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          >
            <CheckCircle2Icon className="size-3" />
            Processed
          </Badge>
        )}
        <span className="font-mono text-sm">{event.type}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatTimestamp(event.receivedAt)}
        </span>
      </div>
      <p className="font-mono text-xs text-muted-foreground">{event.id}</p>
      {event.error && (
        <p className="text-xs text-destructive break-words">{event.error}</p>
      )}
    </div>
  );
}

export function WebhookHealthPanel({ health }: { health: WebhookHealth }) {
  const hasFailures = health.failedCount > 0;

  return (
    <Card
      className={hasFailures ? "border-destructive/40" : "border-border/50"}
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WebhookIcon className="size-4" />
              Stripe Webhook Health
              {hasFailures && (
                <Badge variant="destructive">
                  {health.failedCount} failed
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {hasFailures
                ? "A failed event means a customer may have paid without receiving what they bought. Replay it in Stripe, then refresh."
                : "Every delivered Stripe event has been applied."}
            </CardDescription>
          </div>
          <RefreshBillingButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p
              className={`text-xl font-bold tabular-nums ${
                hasFailures ? "text-destructive" : ""
              }`}
            >
              {health.failedCount}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold tabular-nums">
              {health.pendingCount}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Processed</p>
            <p className="text-xl font-bold tabular-nums">
              {health.processedCount}
            </p>
          </div>
        </div>

        {health.lastEventAt && (
          <p className="text-xs text-muted-foreground">
            Last event received {formatTimestamp(health.lastEventAt)}.
          </p>
        )}

        <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {health.events.length === 0 ? (
            <EmptyState
              title="No webhook events yet"
              description="Nothing has been delivered to the Stripe webhook endpoint."
              icon={<WebhookIcon className="size-12" />}
            />
          ) : (
            health.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
