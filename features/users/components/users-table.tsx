"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { UserWithStats } from "../types";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const columns: ColumnDef<UserWithStats>[] = [
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/users/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.display_name || "No name"}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.role}</Badge>
    ),
  },
  {
    accessorKey: "onboarded",
    header: "Onboarded",
    cell: ({ row }) =>
      row.original.onboarded ? (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
        >
          Yes
        </Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      ),
  },
  {
    accessorKey: "sessionCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Sessions
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.sessionCount}</span>
    ),
  },
  {
    accessorKey: "totalDuration",
    header: "Audio Time",
    cell: ({ row }) => {
      const mins = Math.round(row.original.totalDuration / 60);
      return <span className="tabular-nums">{mins} min</span>;
    },
  },
  {
    accessorKey: "subscriptionPlan",
    header: "Plan",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.subscriptionPlan ?? "Free"}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Joined
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
  },
];

export function UsersTable({ data }: { data: UserWithStats[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="email"
      searchPlaceholder="Search by email..."
    />
  );
}
