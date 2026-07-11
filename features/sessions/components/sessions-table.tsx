"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { SessionWithUser } from "../types";
import Link from "next/link";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const baseColumns: ColumnDef<SessionWithUser>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sessions/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "user_display_name",
    header: "User",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.user_display_name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.user_email}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "module_slug",
    header: "Module",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.module_slug ?? "N/A"}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant =
        status === "completed"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : status === "recording"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
            : "";
      return (
        <Badge variant="outline" className={variant}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Duration
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const secs = row.original.duration;
      const mins = Math.floor(secs / 60);
      const remainSecs = secs % 60;
      return (
        <span className="tabular-nums">
          {mins}:{String(remainSecs).padStart(2, "0")}
        </span>
      );
    },
  },
  {
    accessorKey: "word_count",
    header: "Words",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.word_count.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "chunk_count",
    header: "Chunks",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.chunk_count}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
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

interface SessionsTableProps {
  data: SessionWithUser[];
  /** When provided, renders a per-row trash button that reports the row id. */
  onDelete?: (id: string) => void;
}

export function SessionsTable({ data, onDelete }: SessionsTableProps) {
  // The actions column only exists when the caller wires up deletion, so
  // read-only embeds of this table stay unchanged.
  const columns: ColumnDef<SessionWithUser>[] = onDelete
    ? [
        ...baseColumns,
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete session"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          ),
        },
      ]
    : baseColumns;

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search sessions..."
    />
  );
}
