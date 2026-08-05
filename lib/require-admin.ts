import "server-only";

import { cookies } from "next/headers";

import { COOKIE_NAME, verifySessionToken, type AdminPayload } from "@/lib/auth";

/**
 * Authorization guard for Server Actions.
 *
 * WHY this exists separately from middleware: every mutation in this panel runs
 * through a Server Action that talks to Supabase with the SERVICE-ROLE key,
 * which bypasses RLS entirely. `deleteUserAction` permanently destroys an auth
 * account. Until now the only thing standing in front of those actions was the
 * `/dashboard/:path*` middleware matcher.
 *
 * Middleware is not an authorization boundary you can lean on alone:
 *   - Server Actions are POST endpoints addressable by action id, and a
 *     matcher that misses a path silently unprotects everything under it.
 *   - The Next.js middleware-bypass class of vulnerability (CVE-2025-29927)
 *     is precisely "attacker skips middleware, reaches the handler".
 *   - A future route added outside `/dashboard` inherits no protection at all.
 *
 * So authorization is enforced at the action itself. Middleware stays as the
 * redirect-to-login UX layer; this is the actual gate.
 *
 * @throws Error when there is no valid admin session. Thrown - not returned -
 *   so a caller that forgets to check the result still fails closed.
 */
export async function requireAdmin(): Promise<AdminPayload> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (!token) {
    throw new Error("Unauthorized: no admin session.");
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    throw new Error("Unauthorized: invalid or expired admin session.");
  }

  return payload;
}

/**
 * Record a destructive or privileged mutation.
 *
 * The audit found "destructive mutations without confirmation or an audit
 * trail". This gives every privileged action an attributable server-side
 * record of who did what, independent of anything the browser reports.
 *
 * Deliberately best-effort: an audit-sink failure must never block or reverse
 * the mutation the operator asked for, but it is logged loudly.
 *
 * @param actor  - The verified admin performing the action.
 * @param action - Stable action name, e.g. "user.delete".
 * @param target - Identifier of the affected record.
 * @param detail - Any extra context worth keeping.
 */
export function auditLog(
  actor: AdminPayload,
  action: string,
  target: string,
  detail?: Record<string, unknown>
): void {
  try {
    console.info(
      "[admin-audit] %s actor=%s(%s) target=%s %s",
      action,
      actor.username,
      actor.sub,
      target,
      detail ? JSON.stringify(detail) : ""
    );
  } catch {
    console.warn("[admin-audit] failed to serialise audit entry for %s", action);
  }
}
