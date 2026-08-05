/**
 * Write-time contract for `legal_documents.doc`.
 *
 * This module is the ONLY thing standing between an admin's textarea and a
 * public page. `/legal/*` renders the stored jsonb with an exhaustive
 * `switch (block.kind)`; a block with an unknown kind, a table row that is not
 * a 2-tuple, or a `sections` value that is not an array does not degrade
 * gracefully -- it throws during render and takes the page down for every
 * visitor. So nothing reaches Supabase without passing `parseLegalDoc`.
 *
 * Pure, React-free and free of `server-only`: the Server Actions validate here
 * before writing, and the editor validates here to give instant feedback. Both
 * must agree, which is why there is one schema and not two.
 */
import { z } from "zod";

import type {
  LegalBlock,
  LegalBlockKind,
  LegalDoc,
  LegalSection,
} from "./types";

/** Every content block, discriminated on `kind`. */
const legalBlockSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("p"),
      text: z.string(),
    }),
    z.object({
      kind: z.literal("list"),
      items: z.array(z.string()),
    }),
    z.object({
      kind: z.literal("table"),
      // Tuples, not `z.array(z.string())`: the public renderer destructures
      // every row as `[left, right]` and lays out exactly two columns.
      headers: z.tuple([z.string(), z.string()]),
      rows: z.array(z.tuple([z.string(), z.string()])),
    }),
  ],
  {
    error:
      'Unknown block kind. A block must be one of: "p" (paragraph), "list", or "table".',
  }
);

/** A numbered section: heading plus ordered blocks. */
const legalSectionSchema = z.object({
  heading: z.string().min(1, "Section heading cannot be empty"),
  blocks: z.array(legalBlockSchema),
});

/** The optional highlighted closing callout. */
const legalCalloutSchema = z.object({
  heading: z.string().min(1, "Callout heading cannot be empty"),
  paragraphs: z.array(z.string()),
});

/**
 * The whole document.
 *
 * Unknown keys are stripped rather than rejected (zod object default), so a
 * doc that picks up stray fields from a hand-edit is cleaned on the way in
 * instead of persisting junk the public renderer would ignore anyway.
 */
const legalDocSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  meta: z.array(z.string()),
  intro: z.array(z.string()),
  sections: z.array(legalSectionSchema),
  // `null` is accepted and normalised away: hand-written JSON and some jsonb
  // round-trips express "no callout" as null, but the web type is `callout?`.
  callout: legalCalloutSchema.nullish(),
});

/** Successful parse: a doc guaranteed to match the public contract. */
interface LegalDocParseOk {
  ok: true;
  doc: LegalDoc;
}

/** Failed parse: one readable message per problem, deepest path first. */
interface LegalDocParseError {
  ok: false;
  errors: string[];
}

/** Result of validating an untrusted payload against the `LegalDoc` contract. */
export type LegalDocParseResult = LegalDocParseOk | LegalDocParseError;

/**
 * Render a zod issue path as something an admin can find in the JSON, e.g.
 * `sections[3].blocks[1].rows[0]`.
 */
function formatPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) return "(document root)";
  return path.reduce<string>((acc, key) => {
    if (typeof key === "number") return `${acc}[${key}]`;
    return acc.length > 0 ? `${acc}.${String(key)}` : String(key);
  }, "");
}

/** Collapse a ZodError into `path: message` lines, de-duplicated. */
function formatIssues(error: z.ZodError): string[] {
  const seen = new Set<string>();
  for (const issue of error.issues) {
    seen.add(`${formatPath(issue.path)}: ${issue.message}`);
  }
  return [...seen];
}

/**
 * Validate an untrusted value against the `LegalDoc` contract.
 *
 * @param input - Anything: parsed JSON, a jsonb column, a hand-built object.
 * @returns The validated (and key-stripped) doc, or readable error lines.
 */
export function parseLegalDoc(input: unknown): LegalDocParseResult {
  const parsed = legalDocSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: formatIssues(parsed.error) };
  }

  // Drop the key entirely when there is no callout so the stored jsonb matches
  // the optional-property shape the web app declares.
  const { callout, ...rest } = parsed.data;
  return { ok: true, doc: callout ? { ...rest, callout } : rest };
}

/**
 * Parse a JSON string and validate it. Separates the two failure modes so a
 * trailing comma reads as a syntax error, not "expected object".
 *
 * @param text - Raw JSON from the editor's JSON tab.
 */
export function parseLegalDocJson(text: string): LegalDocParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (err) {
    return {
      ok: false,
      errors: [
        `Invalid JSON: ${err instanceof Error ? err.message : "could not be parsed"}`,
      ],
    };
  }
  return parseLegalDoc(value);
}

/**
 * Tidy a doc immediately before saving: trim every string and drop entries
 * that are empty after trimming.
 *
 * WHY: the public renderer keys `meta`, `intro` and list items by their own
 * text. Blank entries render as invisible bullets and, worse, two blanks
 * collide on the same React key. Structured editors accumulate them naturally
 * (an operator adds a row, then changes their mind), so they are cleaned at
 * the boundary rather than policed in the UI.
 */
export function normalizeLegalDoc(doc: LegalDoc): LegalDoc {
  const cleanList = (values: string[]): string[] =>
    values.map((v) => v.trim()).filter((v) => v.length > 0);

  const normalizeBlock = (block: LegalBlock): LegalBlock => {
    switch (block.kind) {
      case "p":
        return { kind: "p", text: block.text.trim() };
      case "list":
        return { kind: "list", items: cleanList(block.items) };
      case "table":
        return {
          kind: "table",
          headers: [block.headers[0].trim(), block.headers[1].trim()],
          rows: block.rows
            .map(([left, right]): [string, string] => [
              left.trim(),
              right.trim(),
            ])
            // A row with nothing in either cell is an abandoned draft row.
            .filter(([left, right]) => left.length > 0 || right.length > 0),
        };
    }
  };

  const normalized: LegalDoc = {
    title: doc.title.trim(),
    meta: cleanList(doc.meta),
    intro: cleanList(doc.intro),
    sections: doc.sections.map(
      (section): LegalSection => ({
        heading: section.heading.trim(),
        blocks: section.blocks.map(normalizeBlock),
      })
    ),
  };

  if (doc.callout) {
    normalized.callout = {
      heading: doc.callout.heading.trim(),
      paragraphs: cleanList(doc.callout.paragraphs),
    };
  }

  return normalized;
}

/** Report duplicates in a list of strings, for the warning banner. */
function duplicatesOf(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

/**
 * Non-blocking quality warnings.
 *
 * These do not stop a save. They exist because the public renderer uses the
 * text itself as the React key for meta lines, intro paragraphs, sections,
 * list items and table rows -- duplicates there produce console key collisions
 * and unstable reconciliation, which is worth flagging to whoever is about to
 * publish but is not worth blocking a legitimate legal edit over.
 *
 * @param doc - A validated document.
 * @returns Human-readable warnings, empty when the doc is clean.
 */
export function collectLegalDocWarnings(doc: LegalDoc): string[] {
  const warnings: string[] = [];

  if (doc.sections.length === 0) {
    warnings.push("This document has no sections - the page will be nearly empty.");
  }

  for (const dupe of duplicatesOf(doc.meta)) {
    warnings.push(`Duplicate meta line: "${dupe}"`);
  }
  for (const dupe of duplicatesOf(doc.intro)) {
    warnings.push(`Duplicate intro paragraph: "${dupe}"`);
  }
  for (const dupe of duplicatesOf(doc.sections.map((s) => s.heading))) {
    warnings.push(`Duplicate section heading: "${dupe}"`);
  }

  doc.sections.forEach((section, si) => {
    section.blocks.forEach((block, bi) => {
      const where = `Section ${si + 1}, block ${bi + 1}`;
      if (block.kind === "list") {
        if (block.items.length === 0) {
          warnings.push(`${where}: bullet list has no items.`);
        }
        for (const dupe of duplicatesOf(block.items)) {
          warnings.push(`${where}: duplicate list item "${dupe}"`);
        }
      }
      if (block.kind === "table") {
        if (block.rows.length === 0) {
          warnings.push(`${where}: table has no rows.`);
        }
        for (const dupe of duplicatesOf(block.rows.map(([left]) => left))) {
          warnings.push(`${where}: duplicate first-column value "${dupe}"`);
        }
      }
      if (block.kind === "p" && block.text.trim().length === 0) {
        warnings.push(`${where}: empty paragraph.`);
      }
    });
  });

  return warnings;
}

/** A fresh block of the requested kind, for the editor's "add block" menu. */
export function createLegalBlock(kind: LegalBlockKind): LegalBlock {
  switch (kind) {
    case "p":
      return { kind: "p", text: "" };
    case "list":
      return { kind: "list", items: [""] };
    case "table":
      return { kind: "table", headers: ["", ""], rows: [["", ""]] };
  }
}

/** Skeleton used when a document row exists but its `doc` is unusable. */
export const EMPTY_LEGAL_DOC: LegalDoc = {
  title: "Untitled document",
  meta: [],
  intro: [],
  sections: [],
};
