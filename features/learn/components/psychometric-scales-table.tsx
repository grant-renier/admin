"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PsychometricScaleRow } from "../types";
import { Pencil, Trash2 } from "lucide-react";

interface PsychometricScalesTableProps {
  data: PsychometricScaleRow[];
  onEdit?: (item: PsychometricScaleRow) => void;
  onDelete?: (id: string) => void;
}

export function PsychometricScalesTable({
  data,
  onEdit,
  onDelete,
}: PsychometricScalesTableProps) {
  const columns: ColumnDef<PsychometricScaleRow>[] = [
    {
      accessorKey: "label",
      header: "Label",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.label}</span>
      ),
    },
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
          {row.original.key}
        </code>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category ?? "None"}</Badge>
      ),
    },
    {
      accessorKey: "anchor_low",
      header: "Low Anchor",
    },
    {
      accessorKey: "anchor_high",
      header: "High Anchor",
    },
    {
      accessorKey: "is_system",
      header: "System",
      cell: ({ row }) =>
        row.original.is_system ? (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary"
          >
            System
          </Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
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
      searchKey="label"
      searchPlaceholder="Search scales..."
    />
  );
}
