import { AlertTriangleIcon, PackageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  BASKET_CENTS,
  INDIVIDUAL_ADDONS_TOTAL_CENTS,
  formatUsd,
  productShortLabel,
} from "../lib/pricing";
import { INDIVIDUAL_ADDON_KEYS, type AddonMixSummary } from "../types";

/**
 * How customers buy add-ons: the bundled basket, or individual products.
 *
 * Two rows here are support signals rather than analytics:
 *   - "Paying twice" should always be zero. A customer holding the basket AND
 *     an add-on it already grants is being double-charged for one feature.
 *   - "Could save with the basket" is a customer whose separate add-ons cost
 *     more than the bundle - worth an outbound note before they notice.
 *
 * Every amount comes from the billing catalog constant.
 *
 * @module features/billing/components/addon-mix-panel
 */

export function AddonMixPanel({ mix }: { mix: AddonMixSummary }) {
  const totalAddonMrr = mix.basketMrrCents + mix.individualMrrCents;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="size-4" />
          Add-On Mix
        </CardTitle>
        <CardDescription>
          Basket ({formatUsd(BASKET_CENTS)}/mo) versus the same three add-ons
          bought separately ({formatUsd(INDIVIDUAL_ADDONS_TOTAL_CENTS)}/mo)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Basket customers</p>
            <p className="text-2xl font-bold tabular-nums">{mix.basketUsers}</p>
            <p className="text-xs text-muted-foreground">
              {formatUsd(mix.basketMrrCents)}/mo
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">
              Individual add-on customers
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {mix.individualAddonUsers}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUsd(mix.individualMrrCents)}/mo
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {INDIVIDUAL_ADDON_KEYS.map((key) => {
            const count = mix.individualCounts[key];
            const share =
              mix.individualAddonUsers > 0
                ? Math.min(100, (count / mix.individualAddonUsers) * 100)
                : 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{productShortLabel(key)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-border/50 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Add-on MRR</span>
            <span className="font-medium tabular-nums">
              {formatUsd(totalAddonMrr)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              Could save with the basket
            </span>
            <Badge variant="outline">{mix.couldSaveWithBasketUsers}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              {mix.overlappingUsers > 0 && (
                <AlertTriangleIcon className="size-4 text-destructive" />
              )}
              Paying twice for one feature
            </span>
            <Badge
              variant="outline"
              className={
                mix.overlappingUsers > 0
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : undefined
              }
            >
              {mix.overlappingUsers}
            </Badge>
          </div>
        </div>

        {mix.overlappingUsers > 0 && (
          <p className="text-xs text-destructive">
            The basket already grants uploads, full reports and chat. Customers
            holding both should be refunded the overlapping add-on.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
