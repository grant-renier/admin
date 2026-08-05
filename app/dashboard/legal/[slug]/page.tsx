/**
 * Editor route for a single legal document.
 *
 * Server component: it resolves the slug against the allow-list, loads the row
 * and its version history with the service-role client, and hands both to the
 * client editor together with the Server Actions it may call. Passing the
 * actions as props (rather than importing them inside `features/`) keeps the
 * dependency direction one-way - `app/` knows about `features/`, not the
 * reverse - and the editor stays a pure component of its inputs.
 */
import { notFound } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LegalDocEditor } from "@/features/legal";
import {
  getLegalDocumentBySlug,
  getLegalDocumentVersions,
} from "@/features/legal/queries";
import { isLegalSlug } from "@/features/legal/types";
import { ArrowLeftIcon } from "lucide-react";

import {
  publishLegalDocumentAction,
  restoreLegalVersionAction,
  saveLegalDocumentAction,
  unpublishLegalDocumentAction,
} from "../actions";

// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The slug is part of a `legal_documents` CHECK constraint, so anything
  // outside the allow-list can never name a row.
  if (!isLegalSlug(slug)) {
    notFound();
  }

  const legalDocument = await getLegalDocumentBySlug(slug);
  if (!legalDocument) {
    notFound();
  }

  const versions = await getLegalDocumentVersions(legalDocument.id);

  return (
    <>
      <div className="px-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/legal" />}
        >
          <ArrowLeftIcon className="mr-1.5 size-4" />
          Back to Legal
        </Button>
      </div>
      <div className="px-4 pb-6 lg:px-6">
        <LegalDocEditor
          documentRow={legalDocument}
          versions={versions}
          onSave={saveLegalDocumentAction}
          onPublish={publishLegalDocumentAction}
          onUnpublish={unpublishLegalDocumentAction}
          onRestore={restoreLegalVersionAction}
        />
      </div>
    </>
  );
}
