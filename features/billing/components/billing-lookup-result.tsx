import Link from "next/link";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatMinutes, formatUsd } from "../lib/pricing";
import type { BillingUserLookup, LookupUsagePeriod } from "../types";
import { SubscriptionStatusBadge, UsageKindBadge } from "./billing-badges";

/**
 * The support answer sheet for one customer.
 *
 * Deliberately ordered by the question being asked: "why was I charged?"
 * (subscription items and their Stripe ids) then "why am I blocked?" (the
 * current usage period and the ledger entries that drained it).
 *
 * @module features/billing/components/billing-lookup-result
 */

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PeriodSummary({ period }: { period: LookupUsagePeriod }) {
  const allowance = period.includedMinutes + period.purchasedMinutes;
  const pct =
    allowance > 0
      ? Math.min(100, (period.consumedMinutes / allowance) * 100)
      : 100;
  const blocked = period.remainingMinutes <= 0;

  return (
    <div className="space-y-2 rounded-lg border border-border/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <UsageKindBadge kind={period.kind} />
        <span className="text-sm text-muted-foreground">
          {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
        </span>
        {blocked && <Badge variant="destructive">Out of minutes</Badge>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${blocked ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatMinutes(period.includedMinutes)} included +{" "}
        {formatMinutes(period.purchasedMinutes)} purchased −{" "}
        {formatMinutes(period.consumedMinutes)} consumed ={" "}
        <span className={blocked ? "text-destructive" : "font-medium"}>
          {formatMinutes(Math.max(0, period.remainingMinutes))} left
        </span>
      </p>
    </div>
  );
}

export function BillingLookupResult({ data }: { data: BillingUserLookup }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/users/${data.userId}`}
            className="text-lg font-semibold hover:underline"
          >
            {data.email}
          </Link>
          <p className="text-sm text-muted-foreground">
            {data.displayName || "No display name"} · joined{" "}
            {formatDate(data.joinedAt)}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {data.userId}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Recurring spend</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatUsd(data.monthlySpendCents)}
            <span className="text-sm font-normal text-muted-foreground">
              /mo
            </span>
          </p>
        </div>
      </div>

      {/* Stripe truth, when available: if a webhook failed, Supabase is stale
          and this block is what tells support the customer really did pay. */}
      {data.stripe && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3 text-sm">
          <Badge variant="outline">Live from Stripe</Badge>
          {data.stripe.delinquent && (
            <Badge variant="destructive">Delinquent</Badge>
          )}
          {data.stripe.subscriptionStatuses.length > 0 && (
            <span className="text-muted-foreground">
              Stripe subscriptions: {data.stripe.subscriptionStatuses.join(", ")}
            </span>
          )}
          {data.stripe.balanceCents !== null &&
            data.stripe.balanceCents !== 0 && (
              <span className="text-muted-foreground">
                Account balance {formatUsd(data.stripe.balanceCents)}
              </span>
            )}
          <a
            href={data.stripe.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 hover:underline"
          >
            Open in Stripe
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
      )}

      {data.stripeError && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          {data.stripeError}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Subscription items</p>
        {data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subscription items. This customer has never held a paid product.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Stripe subscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productLabel}
                      {item.cancelAtPeriodEnd && (
                        <Badge variant="outline" className="ml-2">
                          Cancels at period end
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(item.amountCents)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.currentPeriodStart)} -{" "}
                      {formatDate(item.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.stripeSubscriptionId ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Usage periods</p>
        {data.periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No usage period. Nothing has provisioned minutes for this customer.
          </p>
        ) : (
          <div className="space-y-2">
            {data.currentPeriod ? (
              <PeriodSummary period={data.currentPeriod} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No period is open right now - this customer is blocked until one
                is provisioned.
              </p>
            )}
            {data.periods
              .filter((p) => !p.current)
              .slice(0, 3)
              .map((period) => (
                <PeriodSummary key={period.id} period={period} />
              ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Recent consumption</p>
        {data.recentConsumption.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No minutes consumed yet.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentConsumption.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(entry.occurredAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.sessionId ? (
                        <Link
                          href={`/dashboard/sessions/${entry.sessionId}`}
                          className="hover:underline"
                        >
                          {entry.sessionName ?? entry.sessionId}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          Session deleted
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinutes(entry.minutes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
