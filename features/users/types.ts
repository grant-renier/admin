import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface UserWithStats extends ProfileRow {
  sessionCount: number;
  totalDuration: number;
  lastSessionAt: string | null;
  subscriptionPlan: string | null;
}

export interface UserDetail extends ProfileRow {
  sessions: Array<{
    id: string;
    name: string;
    status: string;
    duration: number;
    created_at: string;
    module_slug: string | null;
  }>;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  projectCount: number;
  totalMessages: number;
}

export interface OnboardingStep {
  label: string;
  count: number;
  pct: number;
}
