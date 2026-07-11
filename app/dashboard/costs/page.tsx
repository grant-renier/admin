import { CostOverviewCards, CostTrendChart, PerSessionCostTable } from "@/features/costs";
import { getCostSummary, getDailyDeepgramUsage, getDailyAIChatUsage, getDailyBridgeUsage, getPerSessionCosts } from "@/features/costs/queries";
// Admin dashboards must always show live Supabase data, never a
// build-time snapshot.
export const dynamic = "force-dynamic";

export default async function CostOverviewPage() {
  const [summary, deepgramDaily, aiChatDaily, bridgeDaily, perSession] =
    await Promise.all([
      getCostSummary(),
      getDailyDeepgramUsage(),
      getDailyAIChatUsage(),
      getDailyBridgeUsage(),
      getPerSessionCosts(),
    ]);

  const allDates = new Set([
    ...deepgramDaily.map((d) => d.date),
    ...aiChatDaily.map((d) => d.date),
    ...bridgeDaily.map((d) => d.date),
  ]);

  const deepgramMap = new Map(deepgramDaily.map((d) => [d.date, d.cost]));
  const aiChatMap = new Map(aiChatDaily.map((d) => [d.date, d.cost]));
  const bridgeMap = new Map(bridgeDaily.map((d) => [d.date, d.cost]));

  const trendData = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      deepgram: deepgramMap.get(date) ?? 0,
      aiChat: aiChatMap.get(date) ?? 0,
      bridge: bridgeMap.get(date) ?? 0,
    }));

  return (
    <>
      <CostOverviewCards summary={summary} />
      <div className="px-4 lg:px-6">
        <CostTrendChart data={trendData} />
      </div>
      <div className="px-4 lg:px-6">
        <h3 className="text-lg font-semibold mb-3">Per-Session Costs</h3>
        <PerSessionCostTable data={perSession} />
      </div>
    </>
  );
}
