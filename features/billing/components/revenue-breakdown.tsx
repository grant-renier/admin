import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatUsd } from "../lib/pricing";
import { SUBSCRIPTION_STATUSES, type SubscriptionOverview } from "../types";
import { SubscriptionStatusBadge } from "./billing-badges";

/**
 * Active subscriptions and MRR, per product.
 *
 * MRR counts `active` items only - `trialing` has not been charged and
 * `past_due` has been charged but not paid. Both are shown as their own
 * columns so the number matches what the bank will actually see.
 *
 * Unit prices come from the billing catalog constant via the query layer.
 *
 * @module features/billing/components/revenue-breakdown
 */

export function RevenueBreakdown({
  overview,
}: {
  overview: SubscriptionOverview;
}) {
  const visibleStatuses = SUBSCRIPTION_STATUSES.filter(
    (s) => overview.countsByStatus[s] > 0
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Revenue by Product</CardTitle>
        <CardDescription>
          Monthly recurring revenue from active items, priced from the billing
          catalog
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Trialing</TableHead>
                <TableHead className="text-right">Past due</TableHead>
                <TableHead className="text-right">MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.byProduct.map((line) => (
                <TableRow key={line.productKey}>
                  <TableCell className="font-medium">{line.label}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatUsd(line.unitAmountCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.activeCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.trialingCount}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      line.pastDueCount > 0 ? "text-destructive" : ""
                    }`}
                  >
                    {line.pastDueCount}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatUsd(line.mrrCents)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">
                  {overview.byProduct.reduce((s, l) => s + l.activeCount, 0)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {overview.byProduct.reduce((s, l) => s + l.trialingCount, 0)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {overview.byProduct.reduce((s, l) => s + l.pastDueCount, 0)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatUsd(overview.mrrCents)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Subscription items by status</p>
          {visibleStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscription items yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {visibleStatuses.map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
                >
                  <SubscriptionStatusBadge status={status} />
                  <span className="text-lg font-semibold tabular-nums">
                    {overview.countsByStatus[status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
