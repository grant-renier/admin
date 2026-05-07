import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "dev-bypass-secret"
);
const COOKIE_NAME = "intuality-admin-session";
const EXPIRY_HOURS = 24;

export interface AdminPayload {
  sub: string;
  username: string;
}

export async function createSessionToken(
  payload: AdminPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
