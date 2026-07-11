import { UsersTable, OnboardingFunnel } from "@/features/users";
import { getUsers, getUserStats, getOnboardingFunnel } from "@/features/users/queries";
import { MetricCard } from "@/components/metric-card";
import { UsersIcon, UserPlusIcon, ActivityIcon, CalendarIcon } from "lucide-react";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, stats, funnel] = await Promise.all([
    getUsers(),
    getUserStats(),
    getOnboardingFunnel(),
  ]);

  const userGrowth =
    stats.usersLastWeek > 0
      ? ((stats.usersThisWeek - stats.usersLastWeek) / stats.usersLastWeek) *
        100
      : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          change={userGrowth !== 0 ? userGrowth : undefined}
          icon={UsersIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="New This Week"
          value={stats.usersThisWeek}
          icon={UserPlusIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Last Week"
          value={stats.usersLastWeek}
          icon={CalendarIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Active (7d)"
          value={stats.activeUsers}
          subtitle="With sessions this week"
          icon={ActivityIcon}
          accent="emerald"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <OnboardingFunnel steps={funnel} />
      </div>
      <div className="px-4 lg:px-6">
        <UsersTable data={users} />
      </div>
    </>
  );
}
