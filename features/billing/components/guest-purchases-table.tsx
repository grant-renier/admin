"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";

import { formatUsd } from "../lib/pricing";
import type { GuestPurchaseTableRow } from "../types";

/**
 * Recent no-account purchases (currently just the $10 Persona Atlas Guide).
 *
 * Structurally separate from {@link SubscriptionsTable}: these rows have no
 * `user_id` and no link to `/dashboard/users/[id]`, only an email address
 * Stripe Checkout collected. See `GuestPurchaseRow`'s doc comment in
 * `../types.ts` for why.
 *
 * @module features/billing/components/guest-purchases-table
 */

/** `'fulfilled'` here means the receipt email sent, not that the buyer has
 * the actual document - see the `GuestPurchaseTableRow` doc comment. */
function GuestPurchaseStatusBadge({ status }: { status: string }) {
  if (status === "fulfilled") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      >
        Receipt sent
      </Badge>
    );
  }
  if (status === "refunded") {
    return (
      <Badge variant="outline" className="border-muted-foreground/30">
        Refunded
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-500/30 bg-amber-500/10 text-amber-600"
    >
      Paid
    </Badge>
  );
}

const columns: ColumnDef<GuestPurchaseTableRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "productLabel",
    header: "Product",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.productLabel}</span>
    ),
  },
  {
    accessorKey: "amountCents",
    header: "Amount",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatUsd(row.original.amountCents)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <GuestPurchaseStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Purchased",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export function GuestPurchasesTable({ data }: { data: GuestPurchaseTableRow[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No guest purchases yet.
      </p>
    );
  }
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="email"
      searchPlaceholder="Search guest purchases by email..."
    />
  );
}
