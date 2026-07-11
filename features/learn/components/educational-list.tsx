"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EducationalContentRow } from "../types";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";

interface EducationalListProps {
  data: EducationalContentRow[];
  onEdit?: (item: EducationalContentRow) => void;
  onDelete?: (id: string) => void;
}

export function EducationalList({
  data,
  onEdit,
  onDelete,
}: EducationalListProps) {
  const columns: ColumnDef<EducationalContentRow>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.type}</Badge>
      ),
    },
    {
      accessorKey: "module_slug",
      header: "Module",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.module_slug ?? "All"}</Badge>
      ),
    },
    {
      accessorKey: "is_published",
      header: "Status",
      cell: ({ row }) =>
        row.original.is_published ? (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          >
            Published
          </Badge>
        ) : (
          <Badge variant="outline">Draft</Badge>
        ),
    },
    {
      accessorKey: "display_order",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.display_order}</span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {row.original.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.tags.length - 3}
            </Badge>
          )}
        </div>
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
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="title"
      searchPlaceholder="Search content..."
    />
  );
}
