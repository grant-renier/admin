import { getTemplates, TemplatesTable } from "@/features/templates";
import { MetricCard } from "@/components/metric-card";
import { LayoutTemplateIcon, ShieldCheckIcon } from "lucide-react";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  const systemCount = templates.filter((t) => t.is_system).length;
  const totalProjects = templates.reduce(
    (sum, t) => sum + t.projectCount,
    0
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Templates"
          value={templates.length}
          icon={LayoutTemplateIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="System"
          value={systemCount}
          icon={ShieldCheckIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Projects Using"
          value={totalProjects}
          accent="emerald"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <TemplatesTable data={templates} />
      </div>
    </>
  );
}
