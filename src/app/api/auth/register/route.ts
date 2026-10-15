import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  NAME_RE,
  createSession,
  hashPassword,
  isNameTakenError,
  newSalt,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "register", 5);
  if (limited) return limited;
  const { username, password } = await req.json().catch(() => ({}));
  const name = String(username ?? "").trim().toLowerCase();
  const pass = String(password ?? "");

  if (!NAME_RE.test(name)) {
    return Response.json(
      { error: "name must be 3-20 chars: a-z 0-9 _ . -" },
      { status: 400 },
    );
  }
  if (pass.length < 6) {
    return Response.json({ error: "password must be 6+ chars" }, { status: 400 });
  }

  // Who becomes admin:
  //  - ADMIN_USERNAMES set (recommended for production, comma-separated):
  //    only those usernames get admin when they register.
  //  - not set: the first account ever registered becomes admin.
  const adminList = (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users);
  const makeAdmin = adminList.length > 0 ? adminList.includes(name) : n === 0;

  const salt = newSalt();
  try {
    const [u] = await db
      .insert(users)
      .values({
        username: name,
        usernameKey: name,
        salt,
        passwordHash: hashPassword(pass, salt),
        isAdmin: makeAdmin,
      })
      .returning({ id: users.id, username: users.username, isAdmin: users.isAdmin });
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, u.id));
    await createSession(u.id);
    return Response.json({ ok: true, user: u });
  } catch (e) {
    if (isNameTakenError(e)) {
      return Response.json({ error: "that name is taken" }, { status: 409 });
    }
    return Response.json({ error: "could not create account" }, { status: 500 });
  }
}
