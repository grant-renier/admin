"use client";

/**
 * Raw JSON tab for the legal editor.
 *
 * It exists for two jobs the structured editor is bad at: pasting a whole
 * document a lawyer sent over, and repairing a stored payload that no longer
 * matches the contract (in which case the structured editor cannot open it at
 * all and this is the only way in).
 *
 * It is an IMPORT surface, not a second source of truth. Text typed here does
 * nothing until "Validate & apply" parses it against the same schema the
 * Server Action uses; only then does it replace the draft. That keeps a
 * half-typed brace from ever reaching the document state, let alone Supabase.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

import type { LegalDoc } from "../types";
import { parseLegalDocJson } from "../validation";

interface LegalJsonEditorProps {
  /**
   * JSON text to seed the textarea with. The parent remounts this component
   * when the tab is opened, so the seed is always the current draft.
   */
  initialJson: string;
  /** Errors from the initial load, when the stored payload was malformed. */
  initialErrors?: string[];
  /** Called with a validated document when the operator applies the JSON. */
  onApply: (doc: LegalDoc) => void;
}

export function LegalJsonEditor({
  initialJson,
  initialErrors = [],
  onApply,
}: LegalJsonEditorProps) {
  const [text, setText] = useState(initialJson);
  const [errors, setErrors] = useState<string[]>(initialErrors);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    const result = parseLegalDocJson(text);
    if (!result.ok) {
      setErrors(result.errors);
      setApplied(false);
      return;
    }
    setErrors([]);
    setApplied(true);
    onApply(result.doc);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleApply}>
          Validate &amp; apply
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setText(initialJson);
            setErrors(initialErrors);
            setApplied(false);
          }}
        >
          Reset to current draft
        </Button>
        {applied && errors.length === 0 && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="size-4" />
            Applied to the draft - still needs saving.
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-destructive">
            <TriangleAlertIcon className="size-4" />
            {errors.length === 1
              ? "This JSON is not a valid legal document"
              : `${errors.length} problems with this JSON`}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <Textarea
        aria-label="Document JSON"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setApplied(false);
        }}
        className="min-h-[32rem] font-mono text-xs leading-relaxed"
      />

      <p className="text-xs text-muted-foreground">
        Shape:{" "}
        <code className="font-mono">
          {
            '{ title, meta: string[], intro: string[], sections: [{ heading, blocks: [...] }], callout? }'
          }
        </code>
        . A block is{" "}
        <code className="font-mono">{'{ kind: "p", text }'}</code>,{" "}
        <code className="font-mono">{'{ kind: "list", items }'}</code>, or{" "}
        <code className="font-mono">
          {'{ kind: "table", headers: [a, b], rows: [[a, b]] }'}
        </code>
        .
      </p>
    </div>
  );
}
