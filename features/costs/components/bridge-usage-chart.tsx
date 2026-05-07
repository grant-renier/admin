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
import type { DailyBridgeUsage } from "../types";

export function BridgeUsageChart({ data }: { data: DailyBridgeUsage[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Bridge Chunk Assessments</CardTitle>
        <CardDescription>Daily Gemini Flash processing</CardDescription>
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
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })
                }
              />
              <Bar
                dataKey="chunkCount"
                fill="oklch(0.60 0.15 165)"
                radius={[4, 4, 0, 0]}
                name="Chunks"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
