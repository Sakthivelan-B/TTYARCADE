import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "login", 10);
  if (limited) return limited;
  const { username, password } = await req.json().catch(() => ({}));
  const name = String(username ?? "").trim().toLowerCase();
  const pass = String(password ?? "");

  const [u] = await db.select().from(users).where(eq(users.usernameKey, name)).limit(1);
  // Same message for unknown name and bad password (no account enumeration).
  const bad = Response.json({ error: "wrong name or password" }, { status: 401 });
  if (!u) return bad;
  if (!verifyPassword(pass, u.salt, u.passwordHash)) return bad;
  if (u.blocked) {
    return Response.json(
      { error: `account blocked${u.blockedReason ? `: ${u.blockedReason}` : ""}` },
      { status: 403 },
    );
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await createSession(u.id);
  return Response.json({
    ok: true,
    user: { id: u.id, username: u.username, isAdmin: u.isAdmin },
  });
}
