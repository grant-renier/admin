"use client";

import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";

import { formatUsd } from "../lib/pricing";
import type { SubscriptionTableRow } from "../types";
import { SubscriptionStatusBadge } from "./billing-badges";

/**
 * Every subscription item in the system, one row per product a user holds.
 *
 * Uses the shared `DataTable` (@tanstack/react-table) exactly as the users
 * table does, so sorting, filtering and pagination behave identically.
 *
 * The amount column reads `row.amountCents`, which the query derived from the
 * billing catalog constant. Nothing here writes a price.
 *
 * @module features/billing/components/subscriptions-table
 */

const columns: ColumnDef<SubscriptionTableRow>[] = [
  {
    accessorKey: "email",
    header: "Customer",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/users/${row.original.userId}`}
        className="font-medium hover:underline"
      >
        {row.original.email}
      </Link>
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <SubscriptionStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "amountCents",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Amount / mo
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatUsd(row.original.amountCents)}</span>
    ),
  },
  {
    accessorKey: "currentPeriodEnd",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Renews
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const end = row.original.currentPeriodEnd;
      if (!end) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="tabular-nums">
          {new Date(end).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "cancelAtPeriodEnd",
    header: "Cancelling",
    cell: ({ row }) =>
      row.original.cancelAtPeriodEnd ? (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-600"
        >
          At period end
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    accessorKey: "stripeSubscriptionId",
    header: "Stripe subscription",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.stripeSubscriptionId ?? "-"}
      </span>
    ),
  },
];

export function SubscriptionsTable({ data }: { data: SubscriptionTableRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="email"
      searchPlaceholder="Search subscriptions by email..."
    />
  );
}
