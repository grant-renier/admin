import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session signing and verification.
 *
 * WHY there is no fallback secret: this module previously defaulted to the
 * literal `"dev-bypass-secret"` when ADMIN_JWT_SECRET was unset. Anyone who
 * knew that string could mint a valid admin session for any deployment missing
 * the env var - a preview build, a misconfigured container. A signing key with
 * a published default is not a signing key, so the secret is now required and
 * every entry point fails closed without it.
 *
 * Imported by middleware (Edge runtime), so this file deliberately avoids
 * `server-only` and any Node-specific API.
 */

const COOKIE_NAME = "intuality-admin-session";
const EXPIRY_HOURS = 24;

/** Pinned so a token minted for another service can never verify here. */
const ISSUER = "intuality-admin";
const AUDIENCE = "intuality-admin";

/** Thrown when the panel is running without a usable signing secret. */
export class AdminAuthNotConfiguredError extends Error {
  constructor() {
    super("Admin auth is not configured (ADMIN_JWT_SECRET missing or too short).");
    this.name = "AdminAuthNotConfiguredError";
  }
}

/**
 * Resolve the signing key, or throw.
 *
 * Read per call rather than at module load so an unset var surfaces as a
 * handled 503 instead of crashing during bundling.
 */
function secretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  // Length floor: an HS256 key shorter than the digest is cheap to brute
  // force, and short "temporary" secrets have a habit of shipping.
  if (!secret || secret.length < 32) {
    throw new AdminAuthNotConfiguredError();
  }
  return new TextEncoder().encode(secret);
}

/** Whether a usable signing secret is present. */
export function isAdminAuthConfigured(): boolean {
  try {
    secretKey();
    return true;
  } catch {
    return false;
  }
}

/** The identity carried in an admin session cookie. */
export interface AdminPayload {
  sub: string;
  username: string;
}

/** Mint a signed, 24-hour admin session token. */
export async function createSessionToken(
  payload: AdminPayload
): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(secretKey());
}

/**
 * Verify a session token.
 *
 * Returns null for every failure mode - bad signature, expired, wrong
 * issuer/audience, unexpected algorithm, or a payload missing the claims we
 * require. The previous implementation cast the raw payload straight to
 * AdminPayload, so a validly-signed token carrying no `sub` produced an
 * "authenticated" caller with an undefined identity.
 */
export async function verifySessionToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    const sub = payload.sub;
    const username = payload.username;
    if (typeof sub !== "string" || sub.length === 0) return null;
    if (typeof username !== "string" || username.length === 0) return null;

    return { sub, username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
