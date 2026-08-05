"use client";

/**
 * Editor for one numbered section: its heading plus an ordered list of blocks.
 * Collapsible, because a real privacy policy runs to ~20 sections and an
 * always-expanded list is unusable.
 *
 * Controlled - the parent owns the document; this component only ever reports
 * a replacement section.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { moveItem } from "../reorder";
import {
  LEGAL_BLOCK_KINDS,
  LEGAL_BLOCK_LABELS,
  type LegalBlock,
  type LegalSection,
} from "../types";
import { createLegalBlock } from "../validation";
import { LegalBlockEditor } from "./legal-block-editor";

interface LegalSectionEditorProps {
  section: LegalSection;
  index: number;
  onChange: (section: LegalSection) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function LegalSectionEditor({
  section,
  index,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: LegalSectionEditorProps) {
  const [open, setOpen] = useState(false);
  const headingId = `legal-section-${index}-heading`;

  const setBlocks = (blocks: LegalBlock[]) => onChange({ ...section, blocks });

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Collapse section" : "Expand section"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="truncate text-sm font-medium">
          {section.heading || (
            <span className="italic text-muted-foreground">
              Untitled section
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {section.blocks.length}{" "}
          {section.blocks.length === 1 ? "block" : "blocks"}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move section up"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move section down"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete section"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 p-3">
          <div className="space-y-1.5">
            <Label htmlFor={headingId} className="text-xs">
              Section heading
            </Label>
            <Input
              id={headingId}
              value={section.heading}
              onChange={(e) =>
                onChange({ ...section, heading: e.target.value })
              }
              placeholder="1. What IA Does"
            />
          </div>

          <div className="space-y-2">
            {section.blocks.map((block, blockIndex) => (
              <LegalBlockEditor
                // Blocks carry no id; position is their only identity, and a
                // reorder replaces the whole array anyway.
                key={blockIndex}
                idPrefix={`legal-s${index}-b${blockIndex}`}
                block={block}
                index={blockIndex}
                canMoveUp={blockIndex > 0}
                canMoveDown={blockIndex < section.blocks.length - 1}
                onChange={(next) =>
                  setBlocks(
                    section.blocks.map((b, i) => (i === blockIndex ? next : b))
                  )
                }
                onRemove={() =>
                  setBlocks(section.blocks.filter((_, i) => i !== blockIndex))
                }
                onMove={(direction) =>
                  setBlocks(moveItem(section.blocks, blockIndex, direction))
                }
              />
            ))}
            {section.blocks.length === 0 && (
              <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                This section has no content blocks yet.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {LEGAL_BLOCK_KINDS.map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setBlocks([...section.blocks, createLegalBlock(kind)])
                }
              >
                <PlusIcon className="mr-1 size-3.5" />
                {LEGAL_BLOCK_LABELS[kind]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
