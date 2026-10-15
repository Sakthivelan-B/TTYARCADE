import { db } from "@/db";
import { gameScores, rooms, roomPlayers, sessions, users } from "@/db/schema";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const u = await currentUser();
  if (!u?.isAdmin) return null;
  return u;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "admin only" }, { status: 403 });
  }
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      blocked: users.blocked,
      blockedReason: users.blockedReason,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      plays: sql<number>`(select count(*)::int from game_scores g where g.user_id = ${users.id})`,
      best: sql<number>`(select coalesce(max(score),0)::int from game_scores g where g.user_id = ${users.id})`,
    })
    .from(users)
    .orderBy(asc(users.id));

  const [{ userCount, blockedCount, scoreCount, openRooms }] = await db
    .select({
      userCount: sql<number>`(select count(*)::int from users)`,
      blockedCount: sql<number>`(select count(*)::int from users where blocked)`,
      scoreCount: sql<number>`(select count(*)::int from game_scores)`,
      openRooms: sql<number>`(select count(*)::int from rooms where status = 'waiting')`,
    })
    .from(users)
    .limit(1);

  return Response.json({ users: rows, totals: { userCount, blockedCount, scoreCount, openRooms } });
}

/**
 * POST /api/admin/users  { id, action }
 *  - block   : lock the account, kill sessions, drop them from rooms.
 *              Other players keep playing: the seat becomes a CPU seat so an
 *              ongoing game is never broken by a moderation action.
 *  - unblock : restore the account.
 *  - delete  : remove account + scores (scores of OTHER users untouched).
 *  - wipe-scores : keep the account, delete only its scores.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "admin only" }, { status: 403 });
  }
  const { id, action, reason } = await req.json().catch(() => ({}));
  const uid = Number(id);
  if (!uid) return Response.json({ error: "id required" }, { status: 400 });
  const [target] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!target) return Response.json({ error: "no such user" }, { status: 404 });

  if (action === "block" || action === "delete") {
    await db.delete(sessions).where(eq(sessions.userId, uid));
    // hand their seats to CPUs so live games continue for everyone else
    await db
      .update(roomPlayers)
      .set({ isCpu: true, online: false, userId: null })
      .where(eq(roomPlayers.userId, uid));
    await db
      .update(gameScores)
      .set({ userId: null })
      .where(eq(gameScores.userId, uid));
  }

  if (action === "block") {
    await db
      .update(users)
      .set({ blocked: true, blockedReason: String(reason ?? "").slice(0, 120) || null })
      .where(eq(users.id, uid));
  } else if (action === "unblock") {
    await db.update(users).set({ blocked: false, blockedReason: null }).where(eq(users.id, uid));
  } else if (action === "wipe-scores") {
    await db.delete(gameScores).where(eq(gameScores.userId, uid));
  } else if (action === "delete") {
    await db.delete(gameScores).where(eq(gameScores.userId, uid));
    await db.delete(users).where(eq(users.id, uid));
  } else {
    return Response.json({ error: "unknown action" }, { status: 400 });
  }

  // tidy up rooms left without any human seat
  const empty = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(sql`not exists (select 1 from room_players p where p.room_id = ${rooms.id} and p.is_cpu = false)`);
  if (empty.length) await db.delete(rooms).where(sql`${rooms.id} = any(${empty.map((e) => e.id)})`);

  return Response.json({ ok: true });
}
