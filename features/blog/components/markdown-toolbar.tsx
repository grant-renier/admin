"use client";

/**
 * Minimal formatting toolbar for the markdown body textarea. Each button
 * wraps or prefixes the current selection with the relevant markdown syntax
 * and re-focuses the field. Kept intentionally small (bold/italic/H2/link/
 * list) rather than shipping a full rich-text editor.
 */
import { Bold, Italic, Heading2, Link2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RefObject } from "react";

interface MarkdownToolbarProps {
  /** The textarea being edited. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Current body value. */
  value: string;
  /** Setter to apply the transformed value. */
  onChange: (next: string) => void;
}

type Action = { icon: typeof Bold; label: string; apply: (sel: string) => string; wrap?: boolean };

const ACTIONS: Action[] = [
  { icon: Bold, label: "Bold", apply: (s) => `**${s || "bold text"}**`, wrap: true },
  { icon: Italic, label: "Italic", apply: (s) => `*${s || "italic text"}*`, wrap: true },
  { icon: Heading2, label: "Heading", apply: (s) => `## ${s || "Heading"}` },
  { icon: Link2, label: "Link", apply: (s) => `[${s || "link text"}](https://)` },
  { icon: List, label: "List", apply: (s) => (s || "List item")
      .split("\n")
      .map((line) => `- ${line}`)
      .join("\n") },
];

export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: MarkdownToolbarProps) {
  const run = (action: Action) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = action.apply(selected);
    const next = value.slice(0, start) + replacement + value.slice(end);
    onChange(next);
    // Restore focus and place the caret after the inserted markdown.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + replacement.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Markdown formatting">
      {ACTIONS.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="outline"
          size="sm"
          aria-label={action.label}
          onClick={() => run(action)}
        >
          <action.icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}
