"use client";

/**
 * Editor for a single `LegalBlock` -- paragraph, bullet list, or two-column
 * table. Controlled: it never holds block state, it reports a whole replacement
 * block upward so the document stays one immutable value in the parent.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { LEGAL_BLOCK_LABELS, type LegalBlock } from "../types";

interface LegalBlockEditorProps {
  block: LegalBlock;
  /** 0-based position, shown to the operator as 1-based. */
  index: number;
  onChange: (block: LegalBlock) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Stable prefix for input ids so labels stay correctly associated. */
  idPrefix: string;
}

export function LegalBlockEditor({
  block,
  index,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  idPrefix,
}: LegalBlockEditorProps) {
  /** Replace one table row's left/right cell, keeping the 2-tuple shape. */
  const updateRowCell = (rowIndex: number, col: 0 | 1, value: string) => {
    if (block.kind !== "table") return;
    onChange({
      ...block,
      rows: block.rows.map((row, i): [string, string] =>
        i === rowIndex
          ? col === 0
            ? [value, row[1]]
            : [row[0], value]
          : row
      ),
    });
  };

  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {LEGAL_BLOCK_LABELS[block.kind]}
        </span>
        <span className="text-xs text-muted-foreground">Block {index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move block up"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move block down"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete block"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {block.kind === "p" && (
        <Textarea
          id={`${idPrefix}-text`}
          aria-label={`Paragraph ${index + 1}`}
          rows={4}
          value={block.text}
          onChange={(e) => onChange({ kind: "p", text: e.target.value })}
          placeholder="Paragraph text."
        />
      )}

      {block.kind === "list" && (
        <div className="space-y-1.5">
          <Textarea
            id={`${idPrefix}-items`}
            aria-label={`Bullet list ${index + 1}`}
            rows={Math.max(4, block.items.length + 1)}
            // One bullet per line: far faster to edit long legal lists than a
            // stack of single-line inputs. Blank lines are dropped on save.
            value={block.items.join("\n")}
            onChange={(e) =>
              onChange({ kind: "list", items: e.target.value.split("\n") })
            }
            placeholder={"One bullet per line"}
          />
          <p className="text-[11px] text-muted-foreground">
            One bullet per line. Blank lines are removed when you save.
          </p>
        </div>
      )}

      {block.kind === "table" && (
        <div className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-h0`} className="text-xs">
                Left column heading
              </Label>
              <Input
                id={`${idPrefix}-h0`}
                value={block.headers[0]}
                onChange={(e) =>
                  onChange({
                    ...block,
                    headers: [e.target.value, block.headers[1]],
                  })
                }
                placeholder="Category"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-h1`} className="text-xs">
                Right column heading
              </Label>
              <Input
                id={`${idPrefix}-h1`}
                value={block.headers[1]}
                onChange={(e) =>
                  onChange({
                    ...block,
                    headers: [block.headers[0], e.target.value],
                  })
                }
                placeholder="Examples"
              />
            </div>
          </div>

          <div className="space-y-2">
            {block.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-start gap-2">
                <Input
                  aria-label={`Row ${rowIndex + 1} left cell`}
                  value={row[0]}
                  onChange={(e) => updateRowCell(rowIndex, 0, e.target.value)}
                  className="sm:max-w-[34%]"
                />
                <Input
                  aria-label={`Row ${rowIndex + 1} right cell`}
                  value={row[1]}
                  onChange={(e) => updateRowCell(rowIndex, 1, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete row ${rowIndex + 1}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onChange({
                      ...block,
                      rows: block.rows.filter((_, i) => i !== rowIndex),
                    })
                  }
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({ ...block, rows: [...block.rows, ["", ""]] })
            }
          >
            <PlusIcon className="mr-1 size-3.5" />
            Add row
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Every row is exactly two cells - the public page renders a
            fixed two-column table. Fully empty rows are removed on save.
          </p>
        </div>
      )}
    </div>
  );
}
