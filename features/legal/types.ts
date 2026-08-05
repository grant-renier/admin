/**
 * Type surface for the legal-documents feature (Privacy Policy, EULA,
 * Recording Consent).
 *
 * Two distinct type families live here:
 *
 * 1. `LegalDoc` and friends -- the shape of the `legal_documents.doc` jsonb
 *    payload that the PUBLIC web app renders.
 * 2. `LegalDocumentRow` / `LegalDocumentVersionRow` -- the Supabase row shapes
 *    this admin panel reads and writes.
 */

/* ---------------------------------------------------------------------------
 * LegalDoc -- DUPLICATED, ON PURPOSE.
 *
 * The canonical definition lives in the web repo at
 * `IntualityWeb/src/types/legal.ts` and is consumed there by
 * `components/legal/LegalArticle`. This repo is a separate Next.js app with no
 * dependency on that one (there is no shared `packages/*` workspace yet), so
 * the types are mirrored here verbatim rather than imported.
 *
 * CONSEQUENCE: these declarations and the web repo's must stay byte-compatible.
 * If `LegalBlock` ever grows a fourth `kind`, change BOTH files -- the public
 * renderer switches exhaustively on `block.kind`, so a doc saved here with a
 * shape this admin knows and the web app does not will break `/legal/*` for
 * every visitor. `features/legal/validation.ts` is the gate that enforces the
 * contract at write time.
 * ------------------------------------------------------------------------- */

/** A single content block within a legal section. */
export type LegalBlock =
  /** Plain paragraph of body text. */
  | { kind: "p"; text: string }
  /** Bulleted list of items. */
  | { kind: "list"; items: string[] }
  /** Two-column table (e.g. "Category / Examples"). */
  | {
      kind: "table";
      headers: [string, string];
      rows: Array<[string, string]>;
    };

/** The discriminator values a `LegalBlock` may carry, for UI menus. */
export const LEGAL_BLOCK_KINDS = ["p", "list", "table"] as const;

/** Union of valid block discriminators. */
export type LegalBlockKind = (typeof LEGAL_BLOCK_KINDS)[number];

/** Human labels for each block kind, used by the block "add" menu. */
export const LEGAL_BLOCK_LABELS: Record<LegalBlockKind, string> = {
  p: "Paragraph",
  list: "Bullet list",
  table: "Two-column table",
};

/** A numbered section of a legal document. */
export interface LegalSection {
  /** Section heading, e.g. "1. What IA Does". */
  heading: string;
  /** Ordered content blocks inside the section. */
  blocks: LegalBlock[];
}

/** Highlighted closing callout (e.g. the EULA's user disclaimer). */
export interface LegalCallout {
  /** Callout heading. */
  heading: string;
  /** Callout body paragraphs. */
  paragraphs: string[];
}

/** A complete legal document rendered by the web app's `LegalArticle`. */
export interface LegalDoc {
  /** Document title, e.g. "Privacy Policy". */
  title: string;
  /** Header metadata lines (effective date, provider, contact, ...). */
  meta: string[];
  /** Introductory paragraphs before the first numbered section. */
  intro: string[];
  /** Numbered sections in document order. */
  sections: LegalSection[];
  /** Optional highlighted closing callout. */
  callout?: LegalCallout;
}

/* ---------------------------------------------------------------------------
 * Slugs
 * ------------------------------------------------------------------------- */

/**
 * The three documents this panel manages, in display order. Mirrors the
 * `legal_documents.slug` CHECK constraint -- a slug outside this list cannot
 * be inserted, so the list doubles as the router's allow-list.
 */
export const LEGAL_SLUGS = [
  "privacy-policy",
  "eula",
  "recording-consent",
] as const;

/** Union of the managed document slugs. */
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** Display labels for each slug (the DB `title` may be edited freely). */
export const LEGAL_SLUG_LABELS: Record<LegalSlug, string> = {
  "privacy-policy": "Privacy Policy",
  eula: "EULA & Disclaimer",
  "recording-consent": "Recording Consent",
};

/** Where each document surfaces on the public site, for operator context. */
export const LEGAL_SLUG_PUBLIC_PATH: Record<LegalSlug, string> = {
  "privacy-policy": "/legal/privacy",
  eula: "/legal/eula",
  "recording-consent": "/legal/recording-consent",
};

/** Narrowing guard for a route param or form field. */
export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

/* ---------------------------------------------------------------------------
 * Server Action contracts
 *
 * Declared here rather than in `app/dashboard/legal/actions.ts` so the editor
 * components can be typed without `features/` importing from `app/` - the
 * dependency runs one way, app -> features.
 * ------------------------------------------------------------------------- */

/**
 * Result of a legal mutation.
 *
 * `errors` is a list of `path: message` lines rather than a field map: the
 * payload is a single nested document, so "sections[4].blocks[0].kind" is the
 * useful address, not a form field name.
 */
export interface LegalActionState {
  ok: boolean;
  errors?: string[];
  /** Version of the row after the write; the DB trigger decides the number. */
  version?: number;
}

/** Saves the draft document body (title, meta, intro, sections, callout). */
export type SaveLegalDocHandler = (
  formData: FormData
) => Promise<LegalActionState>;

/** Flips published state for one document. */
export type PublishLegalDocHandler = (
  slug: LegalSlug
) => Promise<LegalActionState>;

/** Writes an archived version back as the live document. */
export type RestoreLegalVersionHandler = (
  slug: LegalSlug,
  versionId: string
) => Promise<LegalActionState>;

/* ---------------------------------------------------------------------------
 * Supabase row shapes
 * ------------------------------------------------------------------------- */

/**
 * A `legal_documents` row.
 *
 * `doc` is typed `unknown` deliberately: it is jsonb written by an earlier
 * deploy or by a hand-run SQL statement, so nothing guarantees it still
 * matches `LegalDoc`. Callers run it through `parseLegalDoc` and decide what
 * to do with a malformed payload (the editor falls back to raw JSON so an
 * operator can repair it) rather than trusting a cast.
 */
export type LegalDocumentRow = {
  id: string;
  slug: LegalSlug;
  title: string;
  doc: unknown;
  /** Owned by the BEFORE UPDATE trigger. Never written by this app. */
  version: number;
  effective_date: string | null;
  published: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The only columns this panel may write.
 *
 * `version` is intentionally absent: a BEFORE UPDATE trigger snapshots the
 * outgoing row into `legal_document_versions` and bumps `version` itself
 * whenever `doc` or `title` changes. Setting it here would fight the trigger.
 */
export type LegalDocumentPatch = {
  title?: string;
  doc?: LegalDoc;
  effective_date?: string | null;
  published?: boolean;
  updated_by?: string | null;
};

/** An append-only `legal_document_versions` row (a prior state of a doc). */
export type LegalDocumentVersionRow = {
  id: string;
  document_id: string;
  slug: LegalSlug;
  version: number;
  title: string;
  doc: unknown;
  effective_date: string | null;
  updated_by: string | null;
  created_at: string;
};

/**
 * Minimal `Database` shape for the two legal tables.
 *
 * WHY this exists: the hand-written `Database` interface in `types/supabase.ts`
 * has no `legal_documents` entry, and that file is outside this feature's
 * ownership (other agents are editing it concurrently). Rather than reach for
 * an untyped client, `queries.ts` casts `supabaseAdmin` to a client typed by
 * this local schema so every column name and row shape is still checked.
 * Fold this into `types/supabase.ts` when that file can safely be touched.
 */
export interface LegalDatabase {
  public: {
    Tables: {
      legal_documents: {
        Row: LegalDocumentRow;
        Insert: Omit<
          LegalDocumentRow,
          "id" | "version" | "created_at" | "updated_at"
        >;
        Update: LegalDocumentPatch;
        Relationships: [];
      };
      legal_document_versions: {
        Row: LegalDocumentVersionRow;
        Insert: Omit<LegalDocumentVersionRow, "id" | "created_at">;
        Update: Partial<Omit<LegalDocumentVersionRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
