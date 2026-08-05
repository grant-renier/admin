"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { LayersIcon } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatHour } from "../lib/format";
import type { QueueDepthPoint } from "../types";

interface QueueDepthChartProps {
  data: QueueDepthPoint[];
  /** Estimated sustained concurrency ceiling, drawn as a reference line. */
  ceiling: number;
}

/**
 * Bridge queue depth over time - the leading indicator of engine overload.
 *
 * Peak is plotted alongside the average because an hourly mean of 1 hides a
 * spike to 12, and the spike is the moment the engine fell behind. The
 * reference line marks the estimated sustained ceiling.
 */
export function QueueDepthChart({ data, ceiling }: QueueDepthChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Bridge queue depth (last 24h)</CardTitle>
        <CardDescription>
          Chunks waiting on the serialized engine lock. Sustained depth above
          the ceiling means chunks arrive faster than the engine can score
          them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            title="No bridge checks recorded yet"
            description="Queue depth is captured from the bridge's /health payload on every check."
            icon={<LayersIcon className="size-12" />}
          />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="bucket"
                  className="text-xs"
                  tickFormatter={(v) => formatHour(String(v))}
                />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [Number(value), String(name)]}
                  labelFormatter={(label) => formatHour(String(label))}
                />
                <Legend />
                <ReferenceLine
                  y={ceiling}
                  stroke="oklch(0.62 0.2 25)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Estimated ceiling (${ceiling})`,
                    position: "insideTopRight",
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgQueueDepth"
                  name="Average depth"
                  stroke="oklch(0.60 0.15 165)"
                  fill="oklch(0.60 0.15 165 / 0.25)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="maxQueueDepth"
                  name="Peak depth"
                  stroke="oklch(0.65 0.18 45)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
