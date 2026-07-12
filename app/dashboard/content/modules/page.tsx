import { ModuleEditor } from "@/features/content";
import { getModules } from "@/features/content/queries";
import { MetricCard } from "@/components/metric-card";
import { LayoutGridIcon, ToggleLeftIcon } from "lucide-react";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const modules = await getModules();

  const activeCount = modules.filter((m) => m.is_active).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Categories"
          value={modules.length}
          icon={LayoutGridIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Active"
          value={activeCount}
          icon={ToggleLeftIcon}
          accent="emerald"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <ModuleEditor modules={modules} />
      </div>
    </>
  );
}
