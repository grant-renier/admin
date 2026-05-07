import {
  getEducationalContent,
  EducationalList,
} from "@/features/learn";
import { MetricCard } from "@/components/metric-card";
import { GraduationCapIcon, CheckCircleIcon } from "lucide-react";

export default async function EducationalPage() {
  const content = await getEducationalContent();

  const publishedCount = content.filter((c) => c.is_published).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Content"
          value={content.length}
          icon={GraduationCapIcon}
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
      </div>
      <div className="px-4 lg:px-6">
        <EducationalList data={content} />
      </div>
    </>
  );
}
