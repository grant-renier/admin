"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CostTrendChartProps {
  data: Array<{
    date: string;
    deepgram: number;
    aiChat: number;
    bridge: number;
  }>;
}

export function CostTrendChart({ data }: CostTrendChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Cost Trend (30 days)</CardTitle>
        <CardDescription>Daily breakdown by service</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
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
              <YAxis
                className="text-xs"
                tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
              />
              <Tooltip
                formatter={(value) => `$${Number(value).toFixed(4)}`}
                labelFormatter={(label) =>
                  new Date(String(label)).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="deepgram"
                stackId="1"
                stroke="oklch(0.55 0.2 255)"
                fill="oklch(0.55 0.2 255 / 0.3)"
                name="Deepgram"
              />
              <Area
                type="monotone"
                dataKey="aiChat"
                stackId="1"
                stroke="oklch(0.65 0.18 45)"
                fill="oklch(0.65 0.18 45 / 0.3)"
                name="AI Chat"
              />
              <Area
                type="monotone"
                dataKey="bridge"
                stackId="1"
                stroke="oklch(0.60 0.15 165)"
                fill="oklch(0.60 0.15 165 / 0.3)"
                name="Bridge"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
