import { destroySession, currentUser } from "@/lib/auth";
import { db } from "@/db";
import { gameScores, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}

export async function GET() {
  const u = await currentUser();
  if (!u) return Response.json({ user: null });
  const [{ plays, best }] = await db
    .select({
      plays: sql<number>`count(*)::int`,
      best: sql<number>`coalesce(max(score), 0)::int`,
    })
    .from(gameScores)
    .where(eq(gameScores.userId, u.id));
  const recent = await db
    .select()
    .from(gameScores)
    .where(eq(gameScores.userId, u.id))
    .orderBy(desc(gameScores.createdAt))
    .limit(15);
  const [{ rank }] = await db
    .select({
      rank: sql<number>`(select count(distinct user_id)::int + 1 from game_scores g2
             where g2.user_id is not null and g2.user_id <> ${u.id}
               and (select max(score) from game_scores g3 where g3.user_id = g2.user_id)
                 > (select coalesce(max(score),0) from game_scores g4 where g4.user_id = ${u.id}))`,
    })
    .from(users)
    .where(eq(users.id, u.id));
  return Response.json({
    user: { id: u.id, username: u.username, isAdmin: u.isAdmin, createdAt: u.createdAt },
    stats: { plays: plays ?? 0, best: best ?? 0, rank: rank ?? 0 },
    recent,
  });
}
