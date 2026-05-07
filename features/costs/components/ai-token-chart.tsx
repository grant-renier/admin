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
  Legend,
} from "recharts";
import type { DailyAIChatUsage } from "../types";

export function AITokenChart({ data }: { data: DailyAIChatUsage[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>AI Chat Token Usage</CardTitle>
        <CardDescription>
          Daily input/output tokens via OpenRouter
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
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })
                }
              />
              <Legend />
              <Bar
                dataKey="inputTokens"
                fill="oklch(0.55 0.2 255)"
                radius={[4, 4, 0, 0]}
                name="Input Tokens"
              />
              <Bar
                dataKey="outputTokens"
                fill="oklch(0.65 0.18 45)"
                radius={[4, 4, 0, 0]}
                name="Output Tokens"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
