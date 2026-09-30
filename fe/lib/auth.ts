import prisma from "@/lib/db";
import { APP_CONFIG } from "@/lib/config";

const encoder = new TextEncoder();

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.");
  }
  return secret;
}

async function getCryptoKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getJWTSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (c) => c.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecodeBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binString = atob(base64);
  return Uint8Array.from(binString, (c) => c.charCodeAt(0));
}

export async function signJWT(payload: { userId: string; role: string; name: string }): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + APP_CONFIG.SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  const jwtPayload = { ...payload, exp };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${encodedHeader}.${encodedPayload}`)
  );

  const signature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(token: string): Promise<{ userId: string; role: string; name: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const key = await getCryptoKey();
    const signatureBytes = base64UrlDecodeBytes(signature);

    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      encoder.encode(`${header}.${payload}`)
    );

    if (!verified) return null;

    const decodedPayloadStr = base64UrlDecode(payload);
    const parsedPayload = JSON.parse(decodedPayloadStr);

    if (parsedPayload.exp && Date.now() / 1000 > parsedPayload.exp) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: string; role: string; name: string } | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  
  const payload = await verifyJWT(token);
  if (!payload) return null;

  // Check that the session is still active in the database
  const sessionExists = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
  });
  if (!sessionExists) {
    // Opportunistic cleanup of expired rows
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return null;
  }

  return payload;
}

export async function requireTrainer(): Promise<{ userId: string; role: string; name: string; trainerProfileId: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  if (session.role !== "TRAINER") {
    throw new Error("Not a trainer");
  }
  const profile = await prisma.trainerProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) {
    throw new Error("Trainer profile not found");
  }
  return { ...session, trainerProfileId: profile.id };
}

export async function requireClient(): Promise<{ userId: string; role: string; name: string; clientProfileId: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  if (session.role !== "CLIENT") {
    throw new Error("Not a client");
  }
  const profile = await prisma.clientProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) {
    throw new Error("Client profile not found");
  }
  return { ...session, clientProfileId: profile.id };
}
