/** Gate mode for the user-facing web app. */
export type AccessGateMode = "open" | "paid_only" | "maintenance";

/**
 * Shape of the `app_config.access_gate` jsonb value — the version kill
 * switch the web client polls every ~60s (see intuality-web
 * `hooks/useAppConfig.ts`).
 */
export interface AccessGateConfig {
  mode: AccessGateMode;
  registrations_enabled: boolean;
  message: string | null;
  upgrade_url: string | null;
}

/** Open default used when the row (or table) doesn't exist yet. */
export const DEFAULT_ACCESS_GATE: AccessGateConfig = {
  mode: "open",
  registrations_enabled: true,
  message: null,
  upgrade_url: null,
};
