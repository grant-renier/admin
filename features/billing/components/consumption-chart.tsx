"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { DailyConsumption } from "../types";

/**
 * Assessment minutes consumed per day, from the `minute_consumptions` ledger.
 *
 * Read alongside the minute-allowance tiles this is a capacity forecast: a
 * rising line against a fixed monthly allowance tells you who is going to be
 * blocked before the period ends.
 *
 * @module features/billing/components/consumption-chart
 */

export function ConsumptionChart({ data }: { data: DailyConsumption[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Minute Consumption (30 days)</CardTitle>
        <CardDescription>
          Minutes drawn down from usage periods each day, and how many distinct
          customers drew them
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tickFormatter={(v) =>
                  new Date(`${String(v)}T00:00:00Z`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", timeZone: "UTC" }
                  )
                }
              />
              <YAxis
                yAxisId="minutes"
                className="text-xs"
                tickFormatter={(v) => `${Number(v).toLocaleString()}m`}
              />
              <YAxis
                yAxisId="users"
                orientation="right"
                className="text-xs"
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === "Minutes"
                    ? `${Number(value).toLocaleString()} min`
                    : `${Number(value).toLocaleString()} users`
                }
                labelFormatter={(label) =>
                  new Date(`${String(label)}T00:00:00Z`).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }
                  )
                }
              />
              <Area
                yAxisId="minutes"
                type="monotone"
                dataKey="minutes"
                stroke="oklch(0.65 0.18 45)"
                fill="oklch(0.65 0.18 45 / 0.25)"
                name="Minutes"
              />
              <Line
                yAxisId="users"
                type="monotone"
                dataKey="users"
                stroke="oklch(0.55 0.2 255)"
                strokeWidth={2}
                dot={false}
                name="Customers"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
