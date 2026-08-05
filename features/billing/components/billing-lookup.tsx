"use client";

import { useState, useTransition } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lookupBillingUserAction } from "@/app/dashboard/billing/actions";

import type { BillingUserLookup } from "../types";
import { BillingLookupResult } from "./billing-lookup-result";

/**
 * Per-customer billing lookup by email or user id.
 *
 * The one thing support needs open when someone writes in about being charged
 * or being blocked. It calls a Server Action rather than querying directly:
 * the service-role client must never be reachable from a client component, and
 * the action is where `requireAdmin()` runs.
 *
 * @module features/billing/components/billing-lookup
 */
export function BillingLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BillingUserLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;

    startTransition(async () => {
      setError(null);
      try {
        const response = await lookupBillingUserAction(term);
        if (response.ok) {
          setResult(response.data);
        } else {
          setResult(null);
          setError(response.error);
        }
      } catch {
        // requireAdmin throws on an expired session; say so rather than
        // showing "no such user", which would send support down a rabbit hole.
        setResult(null);
        setError(
          "Lookup failed. Your admin session may have expired - reload and sign in again."
        );
      }
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Customer Billing Lookup</CardTitle>
        <CardDescription>
          Search by email address or Supabase user id to see subscription items,
          the current usage period, and recent minute consumption
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="customer@example.com or 0000-0000-..."
            className="max-w-md"
            aria-label="Customer email or user id"
          />
          <Button type="submit" disabled={isPending} className="gap-2">
            <SearchIcon className="size-4" />
            {isPending ? "Searching..." : "Look up"}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && <BillingLookupResult data={result} />}

        {!result && !error && (
          <p className="text-sm text-muted-foreground">
            Nothing looked up yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
