import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";

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
      const token = await createSessionToken({
        sub: "admin",
        username: expectedUsername,
      });

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

  const token = await createSessionToken({
    sub: "admin",
    username,
  });

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
