import { supabaseAdmin } from "@/lib/supabase/client";
import {
  DEFAULT_ACCESS_GATE,
  type AccessGateConfig,
  type AccessGateMode,
} from "./types";

/** Narrow an unknown jsonb value into a valid gate mode. */
function asMode(value: unknown): AccessGateMode {
  return value === "paid_only" || value === "maintenance" ? value : "open";
}

/**
 * Strict boolean parse - anything but literal true (including a missing
 * legacy row) reads as false, the safe "not enforced" default.
 */
function asBool(value: unknown): boolean {
  return value === true;
}

/**
 * Read the current access gate. Falls back to the open default when the
 * `app_config` table/row doesn't exist yet (migration 0004 not applied),
 * so the settings page renders instead of crashing.
 */
export async function getAccessGate(): Promise<AccessGateConfig> {
  try {
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "access_gate")
      .maybeSingle();
    const value = (data?.value ?? {}) as Record<string, unknown>;
    if (!data) return DEFAULT_ACCESS_GATE;
    return {
      mode: asMode(value.mode),
      registrations_enabled: value.registrations_enabled !== false,
      message: typeof value.message === "string" ? value.message : null,
      upgrade_url:
        typeof value.upgrade_url === "string" ? value.upgrade_url : null,
      entitlements_enforced: asBool(value.entitlements_enforced),
    };
  } catch {
    return DEFAULT_ACCESS_GATE;
  }
}

/** Upsert the access gate row (service-role; RLS blocks client writes). */
export async function updateAccessGate(gate: AccessGateConfig): Promise<void> {
  const { error } = await supabaseAdmin.from("app_config").upsert(
    {
      key: "access_gate",
      value: { ...gate },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw error;
}
