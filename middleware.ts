import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    // Dev convenience only. In production a missing secret must FAIL
    // CLOSED — an unset env var must never publish the whole dashboard.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
    return new NextResponse(
      "Admin auth is not configured (ADMIN_JWT_SECRET missing).",
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
  matcher: ["/dashboard/:path*"],
};
