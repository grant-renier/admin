import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  COOKIE_NAME,
  AdminAuthNotConfiguredError,
  type AdminPayload,
} from "@/lib/auth";

/**
 * Mint a session token, or the documented 503 if the signing secret is
 * missing/too short.
 *
 * `createSessionToken` throws `AdminAuthNotConfiguredError` in that case
 * (see `lib/auth.ts`'s `secretKey`) - previously uncaught here, so a bad
 * `ADMIN_JWT_SECRET` surfaced to the browser as a generic 500 ("Network
 * error") instead of the fail-closed 503 AGENTS.md documents. Both login
 * branches (dev password fallback and the real hash check) go through this
 * so neither can regress back to an unhandled throw.
 */
async function mintOrFail(payload: AdminPayload): Promise<string | NextResponse> {
  try {
    return await createSessionToken(payload);
  } catch (err) {
    if (err instanceof AdminAuthNotConfiguredError) {
      return NextResponse.json(
        { error: "Admin auth is not configured (ADMIN_JWT_SECRET missing or too short)." },
        { status: 503 }
      );
    }
    throw err;
  }
}

/**
 * In-memory login throttle: 5 failures per IP per 15 minutes. Resets on
 * server restart, which is acceptable for a single-admin panel - the goal
 * is stopping unattended brute force, not building a WAF.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; windowStart: number }>();

function isThrottled(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.windowStart > WINDOW_MS) {
    failures.set(ip, { count: 1, windowStart: Date.now() });
    return;
  }
  entry.count += 1;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isThrottled(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedPasswordHash) {
    // The literal-"admin" fallback is a dev convenience; in production a
    // missing hash must fail closed, not accept a known password.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Admin auth is not configured (ADMIN_PASSWORD_HASH missing)." },
        { status: 503 }
      );
    }
    if (username === expectedUsername && password === "admin") {
      const token = await mintOrFail({
        sub: "admin",
        username: expectedUsername,
      });
      if (token instanceof NextResponse) return token;

      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        // This branch is unreachable in production (guarded above), so the
        // cookie is always non-secure here.
        secure: false,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }
    recordFailure(ip);
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  if (username !== expectedUsername) {
    recordFailure(ip);
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hashHex !== expectedPasswordHash) {
    recordFailure(ip);
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  const token = await mintOrFail({
    sub: "admin",
    username,
  });
  if (token instanceof NextResponse) return token;

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
