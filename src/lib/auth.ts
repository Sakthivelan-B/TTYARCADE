import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export const SESSION_COOKIE = "ttyarcade_session";
const SESSION_DAYS = 30;

export const NAME_RE = /^[a-z0-9_.\-]{3,20}$/;

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

const scryptAsync = promisify(scrypt);
export async function hashPassword(password: string, salt: string): Promise<string> {
  return (await scryptAsync(password, salt, 64) as Buffer).toString("hex");
}

export async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const a = Buffer.from(await hashPassword(password, salt), "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(userId: number): Promise<string> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ userId, token, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.delete(SESSION_COOKIE);
}

/** Logged-in, non-blocked user or null (guest). Safe to call in any server context. */
export async function currentUser() {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const u = rows[0]?.user;
    if (!u || u.blocked) return null;
    return u;
  } catch {
    return null;
  }
}

export function isNameTakenError(e: unknown): boolean {
  const error = e as { code?: string; cause?: { code?: string } } | null;
  return (error?.code ?? error?.cause?.code) === "23505";
}
