"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { TemplateWithUsage } from "../types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const columns: ColumnDef<TemplateWithUsage>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.original.description ?? "No description"}
      </span>
    ),
  },
  {
    accessorKey: "module_slug",
    header: "Module",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.module_slug ?? "Global"}</Badge>
    ),
  },
  {
    accessorKey: "is_system",
    header: "Type",
    cell: ({ row }) =>
      row.original.is_system ? (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary"
        >
          System
        </Badge>
      ) : (
        <Badge variant="outline">User</Badge>
      ),
  },
  {
    id: "metricCount",
    header: "Metrics",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.metrics.length}</span>
    ),
  },
  {
    accessorKey: "projectCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Projects
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.projectCount}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
  },
];

export function TemplatesTable({ data }: { data: TemplateWithUsage[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search templates..."
    />
  );
}
