import type { Transaction } from "./room-lifecycle";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, lt, or, isNotNull, sql } from "drizzle-orm";
export async function touchActivity(userId: number | null | undefined, client: typeof db | Transaction = db) {
  if (!userId) return;
  await client.update(users).set({ lastActiveAt: new Date(), inactiveAt: null })
    .where(and(eq(users.id, userId), or(lt(users.lastActiveAt, sql`now() - interval '60 seconds'`), isNotNull(users.inactiveAt))));
}
