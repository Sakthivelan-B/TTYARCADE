import { packGame } from '@/lib/pack/catalog';
import { checkRoomPassword, encodeRoomPassword } from "@/lib/room-access";
import { rateLimit } from "@/lib/rate-limit";
import { onlineAction, settleMemoryRoom } from "@/lib/online-games";
import { leaveGeneric } from "@/lib/room-lifecycle";
import { touchActivity } from "@/lib/activity";
import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db as database } from "@/db";
import { rooms, roomPlayers } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { currentUser, newToken } from "@/lib/auth";
import { dedupeName, uniqueCpuName } from "@/lib/bots";
import { publicRoom, publicSeat } from "@/app/api/rooms/route";

export const dynamic = "force-dynamic";

const OFFLINE_MS = 20_000;

async function load(code: string, db: typeof import("@/db").db | Parameters<Parameters<typeof import("@/db").db.transaction>[0]>[0] = database) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
  if (!room) return null;
  const seats = await db
    .select()
    .from(roomPlayers)
    .where(eq(roomPlayers.roomId, room.id))
    .orderBy(asc(roomPlayers.seat));
  return { room, seats };
}

/** GET /api/rooms/:code?token=  (poll; also refreshes presence) */
export const GET = apiHandler(async function(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token");
  let data = await load(code);
  if (data?.room.game === "memory" && data.room.status === "playing" && Number(data.room.state.resolveAt) > 0 && Number(data.room.state.resolveAt) <= Date.now()) {
    await database.transaction(async tx => {
      const [locked] = await tx.select().from(rooms).where(eq(rooms.id,data!.room.id)).for("update");
      if (locked) {
        const players = await tx.select().from(roomPlayers).where(eq(roomPlayers.roomId,locked.id));
        await settleMemoryRoom(tx,locked,players);
      }
    });
    data = await load(code);
  }
  if (!data) return Response.json({ error: "room not found" }, { status: 404 });
  const { room, seats } = data;

  // Presence is derived; never change seat ownership because a tab is offline.
  const cutoff = new Date(Date.now() - OFFLINE_MS);
  const me = seats.find(s => s.token === token && !s.isCpu && !s.leftAt) ?? null;
  if (me && me.lastSeen < new Date(Date.now() - 10000)) {
    await database.update(roomPlayers).set({lastSeen:new Date(), online:true}).where(eq(roomPlayers.id,me.id));
  }
  for (const seat of seats) seat.online = seat.id === me?.id || (!seat.leftAt && (seat.isCpu || seat.lastSeen >= cutoff));
  return Response.json({
    room: publicRoom(room, me?.seat),
    seats: seats.map((s) => publicSeat(s, s.token === token ? s.token : undefined)),
    me: me ? publicSeat(me, me.token) : null,
  });
});

/**
 * POST /api/rooms/:code
 * { token, action } where action is one of:
 *   join            { name }                     take a seat
 *   leave           {}                           give up the seat
 *   bots            { count }                    add CPU seats (random names)
 *   start           {}                           waiting -> playing
 *   move            { state?, turn?, status?, score?, guard?, takeover? }
 *   rematch         { state, maxPlayers? }       finished -> playing, scores reset
 */
export const POST = apiHandler(async function(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const body = await readJson(req);
  const user = await currentUser();
  return database.transaction(async (db) => {
    const { code: lockCode } = await ctx.params;
    await db.select().from(rooms).where(eq(rooms.code, lockCode.toUpperCase())).for("update");
  const { code } = await ctx.params;
  const action = String(body.action ?? "");
  const data = await load(code, db);
  if (!data) return Response.json({ error: "room not found" }, { status: 404 });
  let { room, seats } = data;

  /* ---------- join needs no token ---------- */
  if (action === "join") {
    if (user?.blocked) return Response.json({ error: "account blocked" }, { status: 403 });
    // Reconnect ONLY with proof of ownership: the seat's own token, or the
    // same logged-in account. Matching a display name is NOT enough (that
    // would let anyone hijack a seat by typing someone else's name); a
    // clashing guest name gets a new seat with a suffix ("ada" -> "ada~2").
    const wantName = String(body.name ?? user?.username ?? "guest").trim().slice(0, 20) || "guest";
    const ownToken = typeof body.token === "string" && body.token.length > 0 ? body.token : null;
    const existing = seats.find(
      (s) => !s.isCpu && ((ownToken !== null && s.token === ownToken) || (user && s.userId === user.id)),
    );
    if (existing) {
      await db.update(roomPlayers).set({ lastSeen: new Date(), online: true }).where(eq(roomPlayers.id, existing.id));
      return Response.json({ room: publicRoom(room, existing.seat), me: publicSeat(existing, existing.token) });
    }
    if (room.passwordHash) {
      const limited=rateLimit(req,"room-access",60); if(limited)return limited;
      if (!await checkRoomPassword(room.passwordHash,body.password)) return Response.json({error:"incorrect room password"},{status:403});
    }
    if (room.status === "finished" && !packGame(room.game)) return Response.json({ error: "game already finished" }, { status: 400 });
    if (seats.length >= room.maxPlayers && !((room.status === "playing" || !!packGame(room.game)) && seats.some((s) => s.isCpu))) return Response.json({ error: "room is full" }, { status: 400 });
    if (room.status === "playing" && !seats.some(s => s.isCpu)) return Response.json({ error: "game already started; reconnect with your original seat" }, { status: 400 });
    // Only explicit CPU/departed seats can be replaced, never offline humans.
    const cpuSeat = seats.find((s) => s.isCpu);
    const name = dedupeName(wantName, seats.map((s) => s.name));
    const token = newToken();
    if (cpuSeat && (room.status === "playing" || !!packGame(room.game))) {
      const [s] = await db
        .update(roomPlayers)
        .set({ name, token, isCpu: false, leftAt: null, online: true, userId: user?.id ?? null, lastSeen: new Date() })
        .where(eq(roomPlayers.id, cpuSeat.id))
        .returning();
      const [updated] = await db.update(rooms).set({version: sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id)).returning();
      return Response.json({ room: publicRoom(updated, s.seat), me: publicSeat(s, token) });
    }
    // Lock the room row so simultaneous joins get distinct seats and the
    // capacity check can't be raced past maxPlayers.
    const joined = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(rooms).where(eq(rooms.id, room.id)).for("update").limit(1);
      if (!locked) return null;
      const current = await tx.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id));
      if (current.length >= locked.maxPlayers) return "full" as const;
      const seatNo = current.length ? Math.max(...current.map((x) => x.seat)) + 1 : 0;
      const finalName = dedupeName(wantName, current.map((x) => x.name));
      const [row] = await tx
        .insert(roomPlayers)
        .values({ roomId: room.id, userId: user?.id ?? null, name: finalName, token, seat: seatNo })
        .returning();
      return row;
    });
    if (joined === null) return Response.json({ error: "room not found" }, { status: 404 });
    if (joined === "full") return Response.json({ error: "room is full" }, { status: 400 });
    seats = [...seats, joined];
    const [updated] = await db.update(rooms).set({version: sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id)).returning();
    return Response.json({ room: publicRoom(updated, joined.seat), me: publicSeat(joined, token) });
  }

  /* ---------- everything below needs a valid seat ---------- */
  const token = String(body.token ?? "");
  const me = seats.find((s) => s.token === token && !s.isCpu && !s.leftAt);
  if (!me) return Response.json({ error: "not in this room" }, { status: 403 });
  await db.update(roomPlayers).set({ lastSeen: new Date(), online: true }).where(eq(roomPlayers.id, me.id));

  if (action === "access" || action === "kick") {
    if (me.seat !== room.hostSeat) return Response.json({error:"host only"},{status:403});
    if (action === "access") {
      const limited=rateLimit(req,"room-access",60); if(limited)return limited;
      const passwordHash=await encodeRoomPassword(body.passwordEnabled,body.password,room.passwordHash);
      await db.update(rooms).set({passwordHash,version:sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id));
    } else {
      const target=seats.find(s=>s.id===body.playerId && s.id!==me.id && !s.isCpu && !s.leftAt);
      if (!target) return Response.json({error:"select another human player"},{status:400});
      await leaveGeneric(db,room,target,seats);
    }
    const fresh=await load(code,db);
    return Response.json({ok:true,room:publicRoom(fresh!.room, me.seat),seats:fresh!.seats.map(s=>publicSeat(s))});
  }
  if (action === "close") {
    if (me.seat !== room.hostSeat) return Response.json({ error: "host only" }, { status: 403 });
    await db.delete(rooms).where(eq(rooms.id,room.id));
    return Response.json({ ok: true, closed: true });
  }
  if (action === "leave") {
    await leaveGeneric(db, room, me, seats);
    return Response.json({ ok: true });
  }
  if (["start", "move", "rematch", "restart", "memory-flip", "race-answer", "pack-command"].includes(action)) await touchActivity(me.userId,db);

  if (["bots", "start", "rematch", "restart"].includes(action) && me.seat !== room.hostSeat) return Response.json({ error: "host only" }, { status: 403 });

  if (action === "bots") {
    if (!["tictactoe", "connect4"].includes(room.game)) return Response.json({ error: "CPU not implemented for this game" }, { status: 400 });
    if (room.status !== "waiting") return Response.json({ error: "CPU seats can only be added before starting" }, { status: 400 });
    const want = Math.max(1, Math.min(9, Number(body.count) || 1));
    let added = 0;
    for (let i = 0; i < want; i++) {
      const cur = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id)).orderBy(asc(roomPlayers.seat));
      if (cur.length >= room.maxPlayers) break;
      const name = uniqueCpuName(cur.map((s) => s.name));
      await db.insert(roomPlayers).values({
        roomId: room.id,
        name,
        token: newToken(),
        seat: cur.length ? Math.max(...cur.map((s) => s.seat)) + 1 : 0,
        isCpu: true,
      });
      added++;
    }
    if (added) await db.update(rooms).set({version:sql`${rooms.version}+1`,updatedAt:new Date()}).where(eq(rooms.id,room.id));
    const fresh = await load(code, db);
    return Response.json({ ok: true, added, room: publicRoom(fresh!.room), seats: fresh!.seats.map((s) => publicSeat(s)) });
  }

  return onlineAction(db, room, seats, me, body);
  });
});
