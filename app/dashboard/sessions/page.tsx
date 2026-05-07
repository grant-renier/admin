import { getSessions, getSessionStats } from "@/features/sessions";
import { SessionsTable } from "@/features/sessions";
import { MetricCard } from "@/components/metric-card";
import { MicIcon, ClockIcon, CalendarIcon, TrendingUpIcon } from "lucide-react";

export default async function SessionsPage() {
  const [sessions, stats] = await Promise.all([
    getSessions(),
    getSessionStats(),
  ]);

  const weekChange =
    stats.sessionsLastWeek > 0
      ? ((stats.sessionsThisWeek - stats.sessionsLastWeek) /
          stats.sessionsLastWeek) *
        100
      : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <MetricCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon={MicIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="This Week"
          value={stats.sessionsThisWeek}
          change={weekChange !== 0 ? weekChange : undefined}
          icon={CalendarIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Last Week"
          value={stats.sessionsLastWeek}
          icon={TrendingUpIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Total Audio"
          value={`${stats.totalAudioHours} hrs`}
          icon={ClockIcon}
          accent="emerald"
          compact
        />
      </div>
      <div className="px-4 lg:px-6">
        <SessionsTable data={sessions} />
      </div>
    </>
  );
}
