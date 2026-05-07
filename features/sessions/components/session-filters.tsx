"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string | null) => void;
}

export function SessionFilters({
  statusFilter,
  onStatusChange,
}: SessionFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="recording">Recording</SelectItem>
          <SelectItem value="created">Created</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
