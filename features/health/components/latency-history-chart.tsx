"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ActivityIcon } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatHour } from "../lib/format";
import { SERVICE_LABELS, type LatencyPoint } from "../types";

/** One line per probed service, matching the palette used on the cost pages. */
const SERIES = [
  { key: "bridge", color: "oklch(0.60 0.15 165)" },
  { key: "supabase", color: "oklch(0.55 0.2 255)" },
  { key: "stripe", color: "oklch(0.65 0.18 45)" },
  { key: "web", color: "oklch(0.60 0.19 320)" },
] as const;

interface LatencyHistoryChartProps {
  data: LatencyPoint[];
  sampleCount: number;
  truncated: boolean;
}

/**
 * Average probe latency per hour, per service.
 *
 * Gaps are real: `connectNulls` stays off so an hour with no recorded check
 * shows as a break rather than as a straight line implying a measurement
 * that never happened.
 */
export function LatencyHistoryChart({
  data,
  sampleCount,
  truncated,
}: LatencyHistoryChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Probe latency (last 24h)</CardTitle>
        <CardDescription>
          Hourly average round-trip time from {sampleCount.toLocaleString()}{" "}
          recorded checks
          {truncated ? " (most recent page of results)" : ""}. Gaps are hours
          with no recorded check.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            title="No checks recorded yet"
            description="History builds up as this page is opened or checks are run."
            icon={<ActivityIcon className="size-12" />}
          />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="bucket"
                  className="text-xs"
                  tickFormatter={(v) => formatHour(String(v))}
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `${Number(v)} ms`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value)} ms`,
                    String(name),
                  ]}
                  labelFormatter={(label) => formatHour(String(label))}
                />
                <Legend />
                {SERIES.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={SERVICE_LABELS[series.key]}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
