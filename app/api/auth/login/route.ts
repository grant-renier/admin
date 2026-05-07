import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
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
    if (username === expectedUsername && password === "admin") {
      const token = await createSessionToken({
        sub: "admin",
        username: expectedUsername,
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
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  if (username !== expectedUsername) {
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
