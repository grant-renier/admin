"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type { PerSessionCost } from "../types";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(n: number): string {
  return `$${n.toFixed(4)}`;
}

const columns: ColumnDef<PerSessionCost>[] = [
  {
    accessorKey: "sessionName",
    header: "Session",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sessions/${row.original.sessionId}`}
        className="font-medium hover:underline"
      >
        {row.original.sessionName}
      </Link>
    ),
  },
  {
    accessorKey: "userEmail",
    header: "User",
  },
  {
    accessorKey: "deepgramCost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Deepgram
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{fmt(row.original.deepgramCost)}</span>
    ),
  },
  {
    accessorKey: "aiChatCost",
    header: "AI Chat",
    cell: ({ row }) => (
      <span className="tabular-nums">{fmt(row.original.aiChatCost)}</span>
    ),
  },
  {
    accessorKey: "bridgeCost",
    header: "Bridge",
    cell: ({ row }) => (
      <span className="tabular-nums">{fmt(row.original.bridgeCost)}</span>
    ),
  },
  {
    accessorKey: "totalCost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Total
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {fmt(row.original.totalCost)}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
  },
];

export function PerSessionCostTable({ data }: { data: PerSessionCost[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="sessionName"
      searchPlaceholder="Search sessions..."
    />
  );
}
