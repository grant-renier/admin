/**
 * Public surface of the legal-documents feature.
 *
 * NOTE: this barrel re-exports `queries.ts`, which imports `server-only`
 * (transitively, via `lib/supabase/client`). That is deliberate - the
 * dashboard overview reads `getLegalDocuments()` from here - but it means a
 * `"use client"` file must NEVER import from this barrel. The components in
 * `./components` import their siblings by relative path for exactly that
 * reason; keep it that way.
 */
export { LegalDocList } from "./components/legal-doc-list";
export { LegalDocEditor } from "./components/legal-doc-editor";
export { LegalDocPreview } from "./components/legal-doc-preview";
export { LegalVersionHistory } from "./components/legal-version-history";

export {
  getLegalDocuments,
  getLegalDocumentBySlug,
  getLegalDocumentVersion,
  getLegalDocumentVersions,
  setLegalDocumentPublished,
  updateLegalDocument,
} from "./queries";

export {
  collectLegalDocWarnings,
  normalizeLegalDoc,
  parseLegalDoc,
  parseLegalDocJson,
} from "./validation";

export type * from "./types";
