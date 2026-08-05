/**
 * Legal documents index: the three documents the public site renders, with
 * slug, title, version, published state and last-updated.
 *
 * Server component - the list is links only, so nothing here ships to the
 * browser.
 */
import { MetricCard } from "@/components/metric-card";
import { LegalDocList } from "@/features/legal";
import { getLegalDocuments } from "@/features/legal/queries";
import { LEGAL_SLUGS } from "@/features/legal/types";
import { parseLegalDoc } from "@/features/legal/validation";
import {
  CircleCheckIcon,
  ScaleIcon,
  TriangleAlertIcon,
} from "lucide-react";

// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function LegalPage() {
  const documents = await getLegalDocuments();

  const publishedCount = documents.filter((doc) => doc.published).length;
  // A row whose jsonb no longer parses is the failure worth surfacing at a
  // glance: it means a public page is either broken or about to be.
  const malformedCount = documents.filter(
    (doc) => !parseLegalDoc(doc.doc).ok
  ).length;
  const missingCount = LEGAL_SLUGS.length - documents.length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-3">
        <MetricCard
          title="Documents"
          value={documents.length}
          subtitle={
            missingCount > 0
              ? `${missingCount} not seeded yet`
              : "All three present"
          }
          icon={ScaleIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Published"
          value={publishedCount}
          subtitle="Readable by the public"
          icon={CircleCheckIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Malformed"
          value={malformedCount}
          subtitle={
            malformedCount > 0
              ? "Will not render on the site"
              : "All documents valid"
          }
          icon={TriangleAlertIcon}
          accent={malformedCount > 0 ? "rose" : "default"}
          compact
        />
      </div>

      <div className="px-4 pb-6 lg:px-6">
        <LegalDocList documents={documents} />
      </div>
    </>
  );
}
