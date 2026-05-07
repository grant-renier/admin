"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { EducationalContentRow } from "../types";

const columns: ColumnDef<EducationalContentRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
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
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
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
];

export function BlogList({ data }: { data: EducationalContentRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="title"
      searchPlaceholder="Search articles..."
    />
  );
}
