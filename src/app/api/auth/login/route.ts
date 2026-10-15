import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function(req: NextRequest) {
  const limited = rateLimit(req, "login", 10);
  if (limited) return limited;
  const { username, password } = await readJson(req);
  const name = String(username ?? "").trim().toLowerCase();
  const pass = String(password ?? "");

  if (name.length > 20 || pass.length > 128) return Response.json({ error: "invalid credentials" }, { status: 400 });
  const [u] = await db.select().from(users).where(eq(users.usernameKey, name)).limit(1);
  // Same message for unknown name and bad password (no account enumeration).
  const bad = Response.json({ error: "wrong name or password" }, { status: 401 });
  if (!u) return bad;
  if (!(await verifyPassword(pass, u.salt, u.passwordHash))) return bad;
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
});
