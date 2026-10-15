import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  NAME_RE,
  createSession,
  hashPassword,
  isNameTakenError,
  newSalt,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function(req: NextRequest) {
  const limited = rateLimit(req, "register", 5);
  if (limited) return limited;
  const { username, password } = await readJson(req);
  const name = String(username ?? "").trim().toLowerCase();
  const pass = String(password ?? "");

  if (!NAME_RE.test(name)) {
    return Response.json(
      { error: "name must be 3-20 chars: a-z 0-9 _ . -" },
      { status: 400 },
    );
  }
  if (pass.length < 8 || pass.length > 128) {
    return Response.json({ error: "password must be 8-128 chars" }, { status: 400 });
  }

  // Administrators must be promoted through a trusted database connection.
  const makeAdmin = false;

  const salt = newSalt();
  try {
    const [u] = await db
      .insert(users)
      .values({
        username: name,
        usernameKey: name,
        salt,
        passwordHash: await hashPassword(pass, salt),
        isAdmin: makeAdmin,
      })
      .returning({ id: users.id, username: users.username, isAdmin: users.isAdmin });
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), lastActiveAt: new Date(), inactiveAt: null })
      .where(eq(users.id, u.id));
    await createSession(u.id);
    return Response.json({ ok: true, user: u });
  } catch (e) {
    if (isNameTakenError(e)) {
      return Response.json({ error: "that name is taken" }, { status: 409 });
    }
    return Response.json({ error: "could not create account" }, { status: 500 });
  }
});
