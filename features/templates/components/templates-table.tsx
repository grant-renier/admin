"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { TemplateWithUsage } from "../types";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCategoryLabel } from "@/lib/utils";

interface TemplatesTableProps {
  data: TemplateWithUsage[];
  onEdit?: (item: TemplateWithUsage) => void;
  onDelete?: (item: TemplateWithUsage) => void;
}

/**
 * Sortable/searchable metric templates table. Edit/delete callbacks are
 * optional so read-only embeddings can reuse the table without actions.
 */
export function TemplatesTable({ data, onEdit, onDelete }: TemplatesTableProps) {
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
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.module_slug
            ? formatCategoryLabel(row.original.module_slug)
            : "Global"}
        </Badge>
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
    ...(onEdit || onDelete
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row.original)}
                    aria-label={`Edit ${row.original.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(row.original)}
                    aria-label={`Delete ${row.original.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ),
          } satisfies ColumnDef<TemplateWithUsage>,
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search templates..."
    />
  );
}
