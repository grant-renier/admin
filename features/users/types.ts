import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Roles assignable from the admin panel. The web app's access-gate kill
 * switch exempts `admin` and `beta` roles, so promoting an account here is
 * how the team keeps its own logins working after a beta cutover.
 */
export type UserRole = "user" | "beta" | "admin";

/** All roles the admin UI offers, in escalation order. */
export const USER_ROLES: readonly UserRole[] = ["user", "beta", "admin"];

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
  /**
   * ISO timestamp the auth user is banned until (from GoTrue admin API),
   * or null when the user is not banned / the auth record is unreachable.
   */
  bannedUntil: string | null;
}

export interface OnboardingStep {
  label: string;
  count: number;
  pct: number;
}
