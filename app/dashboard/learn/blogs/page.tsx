import { getBlogArticles, BlogList } from "@/features/learn";
import { MetricCard } from "@/components/metric-card";
import { BookOpenIcon, CheckCircleIcon } from "lucide-react";

export default async function BlogsPage() {
  const articles = await getBlogArticles();

  const publishedCount = articles.filter((a) => a.is_published).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Articles"
          value={articles.length}
          icon={BookOpenIcon}
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
        <BlogList data={articles} />
      </div>
    </>
  );
}
