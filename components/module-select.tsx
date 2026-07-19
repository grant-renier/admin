"use client";

/**
 * Shared module ("category") picker bound to the authoritative `MODULES`
 * constant. Used by BOTH the blog and educational forms so content can only
 * ever target a real module slug (no more free-text typos). The sentinel
 * value "all" maps to null/"" at the form-submit boundary.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODULES } from "@/lib/modules";

/** Sentinel option meaning "no specific module / all categories". */
export const ALL_MODULES_VALUE = "all";

interface ModuleSelectProps {
  /** Current value: a module slug or the "all" sentinel. */
  value: string;
  /** Fired with the newly selected value (slug or "all"). */
  onValueChange: (value: string) => void;
  /** Accessible id linking an external <Label>. */
  id?: string;
  /** Whether to render the leading "All Categories" option. */
  includeAll?: boolean;
}

export function ModuleSelect({
  value,
  onValueChange,
  id,
  includeAll = true,
}: ModuleSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value={ALL_MODULES_VALUE}>All Categories</SelectItem>
        )}
        {MODULES.map((m) => (
          <SelectItem key={m.slug} value={m.slug}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
