/**
 * Blog dashboard route. Server component that loads all posts + distinct tags
 * from Supabase (never a build-time snapshot) and hands them to the client
 * shell which owns editor/table state.
 */
import { getBlogPosts, getDistinctBlogTags } from "@/features/blog/queries";
import { MetricCard } from "@/components/metric-card";
import { BookOpenIcon, CheckCircleIcon, ClockIcon } from "lucide-react";
import { BlogPageClient } from "./client";

// Admin dashboards must always reflect live Supabase data.
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const [posts, tags] = await Promise.all([
    getBlogPosts(),
    getDistinctBlogTags(),
  ]);
  const publishedCount = posts.filter((p) => p.is_published).length;
  const scheduledCount = posts.filter(
    (p) => p.scheduled_for && !p.is_published
  ).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Posts"
          value={posts.length}
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
        <MetricCard
          title="Scheduled"
          value={scheduledCount}
          icon={ClockIcon}
          accent="amber"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <BlogPageClient data={posts} tagSuggestions={tags} />
      </div>
    </>
  );
}
