"use client";

/**
 * Chip-style tag editor with autocomplete against a list of existing tags.
 * Emits the current tag array upward; the parent form serialises it into a
 * hidden field. Replaces the old error-prone comma-separated free-text input.
 */
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  /** Controlled list of selected tags. */
  value: string[];
  /** Fired with the next tag array on any add/remove. */
  onChange: (tags: string[]) => void;
  /** Distinct tags from existing content, used for suggestions. */
  suggestions?: string[];
  /** Input id linking an external <Label>. */
  id?: string;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
  placeholder = "Add a tag and press Enter",
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  /** Suggestions not already chosen and matching the current draft. */
  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter((s) => !value.includes(s) && s.toLowerCase().includes(q))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeTag(tag)}
              className="rounded-full outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              removeTag(value[value.length - 1]);
            }
          }}
          aria-autocomplete="list"
        />
        {filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {filtered.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => addTag(s)}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
