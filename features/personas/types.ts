/**
 * Type surface for the standalone Persona Atlas feature. Rows are sourced from
 * the `personas` table (see the web repo migration); insert/update shapes
 * derive from the generated Supabase types so queries stay type-safe.
 */
import type { Database } from "@/types/supabase";

/** A single scored metric attached to a persona (stored in the jsonb array). */
export interface PersonaMetric {
  key: string;
  label: string;
  description: string;
}

/** A fully-hydrated persona row as read from Supabase. */
export type Persona = Database["public"]["Tables"]["personas"]["Row"];

/** Fields accepted when creating a persona (id/timestamps are server-managed). */
export type PersonaInsert = Database["public"]["Tables"]["personas"]["Insert"];

/** Partial patch accepted when editing an existing persona. */
export type PersonaUpdate = Database["public"]["Tables"]["personas"]["Update"];
