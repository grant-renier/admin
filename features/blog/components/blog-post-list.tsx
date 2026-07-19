"use client";

/**
 * Blog post table with faceted filters (status + module), full-text title
 * search, row selection and bulk publish/unpublish/delete. Built directly on
 * @tanstack/react-table rather than the shared DataTable because that
 * component doesn't expose selection or faceting.
 */
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type RowSelectionState,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { moduleLabel } from "@/lib/modules";
import type { BlogPost } from "../types";

interface BlogPostListProps {
  data: BlogPost[];
  onEdit?: (item: BlogPost) => void;
  onDelete?: (id: string) => void;
  onBulkPublish?: (ids: string[], published: boolean) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const ALL = "__all__";

export function BlogPostList({
  data,
  onEdit,
  onDelete,
  onBulkPublish,
  onBulkDelete,
}: BlogPostListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [status, setStatus] = useState<string>(ALL);
  const [module, setModule] = useState<string>(ALL);

  // Apply the faceted filters up front so paging/selection see the subset.
  const filtered = useMemo(
    () =>
      data.filter((p) => {
        if (status === "published" && !p.is_published) return false;
        if (status === "draft" && p.is_published) return false;
        if (module !== ALL && (p.module_slug ?? "") !== module) return false;
        return true;
      }),
    [data, status, module]
  );

  const columns: ColumnDef<BlogPost>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.title}</span>
            <span className="text-xs text-muted-foreground">
              /{row.original.slug}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "module_slug",
        header: "Module",
        cell: ({ row }) => (
          <Badge variant="outline">{moduleLabel(row.original.module_slug)}</Badge>
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
        accessorKey: "reading_time",
        header: "Read",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.reading_time ?? 0}m
          </span>
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
                aria-label="Edit post"
                onClick={() => onEdit(row.original)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete post"
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
    [onEdit, onDelete]
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
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const clearSelection = () => setRowSelection({});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search titles..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("title")?.setFilterValue(e.target.value)
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
        <Select value={module} onValueChange={(v) => v && setModule(v)}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by module">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All modules</SelectItem>
            {[...new Set(data.map((p) => p.module_slug).filter(Boolean))].map(
              (m) => (
                <SelectItem key={m as string} value={m as string}>
                  {moduleLabel(m)}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <div className="flex-1" />
          {onBulkPublish && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onBulkPublish(selectedIds, true);
                  clearSelection();
                }}
              >
                <Eye className="mr-1 size-4" />
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onBulkPublish(selectedIds, false);
                  clearSelection();
                }}
              >
                <EyeOff className="mr-1 size-4" />
                Unpublish
              </Button>
            </>
          )}
          {onBulkDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onBulkDelete(selectedIds);
                clearSelection();
              }}
            >
              <Trash2 className="mr-1 size-4" />
              Delete
            </Button>
          )}
        </div>
      )}

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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
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
                  No posts match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} post(s)
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
