"use client";

/**
 * Persona table with a status filter, name search and per-row edit / publish /
 * delete controls. Built directly on @tanstack/react-table to match the blog
 * list; personas are few so pagination is generous.
 */
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Persona } from "../types";

interface PersonaListProps {
  data: Persona[];
  onEdit?: (item: Persona) => void;
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string, published: boolean) => void;
}

const ALL = "__all__";

export function PersonaList({
  data,
  onEdit,
  onDelete,
  onTogglePublish,
}: PersonaListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [status, setStatus] = useState<string>(ALL);

  // Apply the status filter up front so paging sees the subset.
  const filtered = useMemo(
    () =>
      data.filter((p) => {
        if (status === "published" && !p.is_published) return false;
        if (status === "draft" && p.is_published) return false;
        return true;
      }),
    [data, status]
  );

  const columns: ColumnDef<Persona>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">
              /{row.original.slug}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "archetype_title",
        header: "Archetype",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.archetype_title || "—"}
          </span>
        ),
      },
      {
        id: "metric_count",
        header: "Metrics",
        cell: ({ row }) => (
          <Badge variant="outline" className="tabular-nums">
            {row.original.metrics?.length ?? 0}
          </Badge>
        ),
      },
      {
        accessorKey: "display_order",
        header: "Order",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.display_order}
          </span>
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1">
            {onTogglePublish && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={
                  row.original.is_published
                    ? "Unpublish persona"
                    : "Publish persona"
                }
                onClick={() =>
                  onTogglePublish(
                    row.original.id,
                    !row.original.is_published
                  )
                }
              >
                {row.original.is_published ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Edit persona"
                onClick={() => onEdit(row.original)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete persona"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(row.original.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onEdit, onDelete, onTogglePublish]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search names..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("name")?.setFilterValue(e.target.value)
          }
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No personas match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} persona(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
