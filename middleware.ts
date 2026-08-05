import { NextResponse, type NextRequest } from "next/server";

import {
  COOKIE_NAME,
  isAdminAuthConfigured,
  verifySessionToken,
} from "@/lib/auth";

/**
 * Redirect-to-login layer for the admin dashboard.
 *
 * IMPORTANT: this is a UX layer, NOT the authorization boundary. Every Server
 * Action independently calls `requireAdmin()` (see lib/require-admin.ts),
 * because middleware alone is not a boundary you can rely on - Server Actions
 * are addressable POST endpoints, matchers silently miss newly added paths,
 * and the Next.js middleware-bypass vulnerability class (CVE-2025-29927) is
 * exactly "attacker skips middleware, reaches the handler". Deleting a check
 * here must never be able to expose a mutation.
 */
export async function middleware(request: NextRequest) {
  // A missing or too-short signing secret is unrecoverable: no token can be
  // verified, so serve a clear 503 rather than a login loop. This now applies
  // in EVERY environment - the previous build returned next() whenever
  // NODE_ENV !== "production", which published the whole dashboard on any
  // preview or misconfigured deployment where the secret was absent.
  if (!isAdminAuthConfigured()) {
    return new NextResponse(
      "Admin auth is not configured (ADMIN_JWT_SECRET missing or shorter than 32 characters).",
      { status: 503 }
    );
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Everything under /dashboard, plus any future /api route EXCEPT the auth
  // endpoints themselves - login must stay reachable to unauthenticated
  // callers, and it does its own per-IP throttling.
  matcher: ["/dashboard/:path*", "/api/((?!auth/).*)"],
};
