/**
 * Personas dashboard route. Server component that loads all personas + the
 * current Atlas PDF URL from Supabase (never a build-time snapshot) and hands
 * them to the client shell which owns editor/table state. Mirrors the blog
 * page.
 */
import { getPersonas, getAtlasPdfUrl } from "@/features/personas/queries";
import { MetricCard } from "@/components/metric-card";
import { UsersRoundIcon, CheckCircleIcon, LayersIcon } from "lucide-react";
import { PersonasPageClient } from "./client";

// Admin dashboards must always reflect live Supabase data.
export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const [personas, atlasPdfUrl] = await Promise.all([
    getPersonas(),
    getAtlasPdfUrl(),
  ]);
  const publishedCount = personas.filter((p) => p.is_published).length;
  const metricCount = personas.reduce(
    (sum, p) => sum + (p.metrics?.length ?? 0),
    0
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Personas"
          value={personas.length}
          icon={UsersRoundIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Published"
          value={publishedCount}
          icon={CheckCircleIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Metrics Defined"
          value={metricCount}
          icon={LayersIcon}
          accent="blue"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <PersonasPageClient data={personas} atlasPdfUrl={atlasPdfUrl} />
      </div>
    </>
  );
}
