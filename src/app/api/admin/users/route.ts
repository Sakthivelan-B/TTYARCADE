import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { db } from "@/db";
import { gameScores, rooms, roomPlayers, sessions, users, cardPlayers, cardRooms } from "@/db/schema";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";
import { leaveGeneric, leaveCards } from "@/lib/room-lifecycle";
import { currentUser, newToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const u = await currentUser();
  if (!u?.isAdmin) return null;
  return u;
}

export const GET = apiHandler(async function() {
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
      lastActiveAt: users.lastActiveAt,
      inactiveAt: users.inactiveAt,
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
      openRooms: sql<number>`(select (select count(*) from rooms)+(select count(*) from card_rooms))::int`,
    })
    .from(users)
    .limit(1);

  const gameStats=await db.select({userId:gameScores.userId,game:gameScores.game,plays:sql<number>`count(*)::int`,best:sql<number>`max(${gameScores.score})`,lastPlayedAt:sql<Date>`max(${gameScores.createdAt})`}).from(gameScores).groupBy(gameScores.userId,gameScores.game);
  const recentScores=await db.select({id:gameScores.id,userId:gameScores.userId,playerName:gameScores.playerName,game:gameScores.game,score:gameScores.score,createdAt:gameScores.createdAt}).from(gameScores).orderBy(desc(gameScores.createdAt),desc(gameScores.id)).limit(100);
  return Response.json({ users: rows, gameStats:gameStats.filter(s=>s.userId!==null), recentScores, totals: { userCount, blockedCount, scoreCount, openRooms } });
});

/**
 * POST /api/admin/users  { id, action }
 *  - block   : lock the account, kill sessions, drop them from rooms.
 *              Other players keep playing: the seat becomes a CPU seat so an
 *              ongoing game is never broken by a moderation action.
 *  - unblock : restore the account.
 *  - delete  : remove account + scores (scores of OTHER users untouched).
 *  - wipe-scores : keep the account, delete only its scores.
 */
export const POST = apiHandler(async function(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "admin only" }, { status: 403 });
  const { id, action, reason } = await readJson(req);
  const uid = Number(id);
  if (!uid) return Response.json({ error: "id required" }, { status: 400 });
  const [target] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (target?.id === admin.id && ["block", "delete"].includes(String(action))) return Response.json({ error: "cannot remove your own admin access" }, { status: 400 });
  if (!target) return Response.json({ error: "no such user" }, { status: 404 });

  if (action === "block" || action === "delete") {
    await db.delete(sessions).where(eq(sessions.userId, uid));
    // Administrative removal revokes seat credentials and transfers host control.
    // Keep array/hand positions during play. Moderation never expires a room.
    const genericSeats = await db.select().from(roomPlayers).where(eq(roomPlayers.userId,uid));
    for (const seat of genericSeats) await db.transaction(async tx => {
      const [room] = await tx.select().from(rooms).where(eq(rooms.id,seat.roomId)).for("update");
      if (!room) return;
      const all = await tx.select().from(roomPlayers).where(eq(roomPlayers.roomId,room.id)).orderBy(asc(roomPlayers.seat));
      if (all.some(s => s.id!==seat.id && !s.isCpu && !s.leftAt)) await leaveGeneric(tx,room,seat,all);
      else {
        await tx.update(roomPlayers).set({leftAt:new Date(),token:newToken(),isCpu:true,online:false,userId:null}).where(eq(roomPlayers.id,seat.id));
        await tx.update(rooms).set({version:sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id));
      }
    });
    const cardSeats = await db.select().from(cardPlayers).where(eq(cardPlayers.userId,uid));
    for (const seat of cardSeats) await db.transaction(async tx => {
      const [room] = await tx.select().from(cardRooms).where(eq(cardRooms.id,seat.roomId)).for("update");
      if (!room) return;
      const all = await tx.select().from(cardPlayers).where(eq(cardPlayers.roomId,room.id)).orderBy(asc(cardPlayers.position));
      if (all.some(s => s.id!==seat.id && !s.isCpu && !s.leftAt)) await leaveCards(tx,room,seat,all);
      else await tx.update(cardPlayers).set({leftAt:new Date(),token:newToken(),isCpu:true,userId:null}).where(eq(cardPlayers.id,seat.id));
    });
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

  return Response.json({ ok: true });
});
