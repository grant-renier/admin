"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyDeepgramUsage } from "../types";

export function DeepgramUsageChart({
  data,
}: {
  data: DailyDeepgramUsage[];
}) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Deepgram Minutes</CardTitle>
        <CardDescription>
          Daily audio minutes processed (Nova-3)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={(v) =>
                  new Date(String(v)).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value, name) =>
                  name === "cost"
                    ? `$${Number(value).toFixed(4)}`
                    : `${Number(value).toFixed(1)} min`
                }
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })
                }
              />
              <Bar
                dataKey="minutes"
                fill="oklch(0.55 0.2 255)"
                radius={[4, 4, 0, 0]}
                name="Minutes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
