import { NextRequest } from "next/server";
import { db } from "@/db";
import { rooms, roomPlayers, gameScores } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { currentUser, newToken } from "@/lib/auth";
import { dedupeName, uniqueCpuName } from "@/lib/bots";
import { publicRoom, publicSeat } from "@/app/api/rooms/route";

export const dynamic = "force-dynamic";

const OFFLINE_MS = 20_000;

async function load(code: string) {
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
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token");
  const data = await load(code);
  if (!data) return Response.json({ error: "room not found" }, { status: 404 });
  const { room, seats } = data;

  // presence: mark stale human seats offline so the UI + CPU takeover can react
  const cutoff = new Date(Date.now() - OFFLINE_MS);
  for (const s of seats) {
    const stale = !s.isCpu && s.lastSeen < cutoff;
    if (s.token === token) {
      await db.update(roomPlayers).set({ lastSeen: new Date(), online: true }).where(eq(roomPlayers.id, s.id));
      s.online = true;
      s.lastSeen = new Date();
    } else if (stale && s.online) {
      await db.update(roomPlayers).set({ online: false }).where(eq(roomPlayers.id, s.id));
      s.online = false;
    }
  }

  const me = seats.find((s) => s.token === token) ?? null;
  return Response.json({
    room: publicRoom(room),
    seats: seats.map((s) => publicSeat(s, s.token === token ? s.token : undefined)),
    me: me ? publicSeat(me, me.token) : null,
  });
}

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
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const data = await load(code);
  if (!data) return Response.json({ error: "room not found" }, { status: 404 });
  let { room, seats } = data;

  /* ---------- join needs no token ---------- */
  if (action === "join") {
    if (room.status === "finished") return Response.json({ error: "game already finished" }, { status: 400 });
    const user = await currentUser();
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
      return Response.json({ room: publicRoom(room), me: publicSeat(existing, existing.token) });
    }
    if (seats.length >= room.maxPlayers) return Response.json({ error: "room is full" }, { status: 400 });
    // prefer replacing an offline CPU seat so a real player can take over
    const cpuSeat = seats.find((s) => s.isCpu);
    const name = dedupeName(wantName, seats.map((s) => s.name));
    const token = newToken();
    if (cpuSeat && room.status === "playing") {
      const [s] = await db
        .update(roomPlayers)
        .set({ name, token, isCpu: false, online: true, userId: user?.id ?? null, lastSeen: new Date() })
        .where(eq(roomPlayers.id, cpuSeat.id))
        .returning();
      return Response.json({ room: publicRoom(room), me: publicSeat(s, token) });
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
    return Response.json({ room: publicRoom(room), me: publicSeat(joined, token) });
  }

  /* ---------- everything below needs a valid seat ---------- */
  const token = String(body.token ?? "");
  const me = seats.find((s) => s.token === token);
  if (!me) return Response.json({ error: "not in this room" }, { status: 403 });
  await db.update(roomPlayers).set({ lastSeen: new Date(), online: true }).where(eq(roomPlayers.id, me.id));

  if (action === "leave") {
    if (room.status === "playing" && seats.filter((s) => !s.isCpu).length > 1) {
      // keep the game alive for the others: seat becomes a CPU
      await db.update(roomPlayers).set({ isCpu: true, online: false, userId: null }).where(eq(roomPlayers.id, me.id));
    } else {
      await db.delete(roomPlayers).where(eq(roomPlayers.id, me.id));
      const left = seats.filter((s) => s.id !== me.id);
      if (!left.length || left.every((s) => s.isCpu)) await db.delete(rooms).where(eq(rooms.id, room.id));
    }
    return Response.json({ ok: true });
  }

  if (action === "bots") {
    if (room.status === "finished") return Response.json({ error: "game finished" }, { status: 400 });
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
    const fresh = await load(code);
    return Response.json({ ok: true, added, room: publicRoom(fresh!.room), seats: fresh!.seats.map((s) => publicSeat(s)) });
  }

  if (action === "start") {
    const cur = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, room.id)).orderBy(asc(roomPlayers.seat));
    if (cur.length < 2) return Response.json({ error: "need at least 2 players" }, { status: 400 });
    const state = (body.state ?? {}) as Record<string, unknown>;
    const [r] = await db
      .update(rooms)
      .set({ status: "playing", turn: Number(body.turn ?? 0), state, round: 1, updatedAt: new Date() })
      .where(eq(rooms.id, room.id))
      .returning();
    return Response.json({ ok: true, room: publicRoom(r), seats: cur.map((s) => publicSeat(s)) });
  }

  if (action === "move") {
    if (room.status === "finished") return Response.json({ error: "game over" }, { status: 400 });
    const st = (room.state ?? {}) as Record<string, unknown>;
    const guard = body.guard as { key: string; value: unknown } | undefined;
    if (guard && JSON.stringify(st[guard.key]) !== JSON.stringify(guard.value)) {
      const fresh = await load(code);
      return Response.json({ error: "stale", room: publicRoom(fresh!.room), seats: fresh!.seats.map((s) => publicSeat(s)) }, { status: 409 });
    }
    if (body.expectTurn !== undefined && Number(body.expectTurn) !== room.turn) {
      const fresh = await load(code);
      return Response.json({ error: "not your turn", room: publicRoom(fresh!.room), seats: fresh!.seats.map((s) => publicSeat(s)) }, { status: 409 });
    }
    const seatIndex = seats.findIndex((s) => s.id === me.id);
    // A human may also move for a CPU seat (that is how bots are driven).
    const turnSeat = seats[room.turn];
    if (body.expectTurn !== undefined && room.turn !== seatIndex && !turnSeat?.isCpu && !me.isCpu) {
      return Response.json({ error: "not your turn" }, { status: 409 });
    }

    const nextState = body.state ? { ...st, ...(body.state as Record<string, unknown>) } : st;
    if (body.takeover !== undefined) {
      const pos = Number(body.takeover);
      const target = seats[pos];
      const stale = target && !target.isCpu && target.lastSeen < new Date(Date.now() - OFFLINE_MS);
      if (target && (target.isCpu || stale)) {
        await db.update(roomPlayers).set({ isCpu: true, online: false }).where(eq(roomPlayers.id, target.id));
      }
    }
    if (typeof body.score === "number") {
      await db.update(roomPlayers).set({ score: body.score }).where(eq(roomPlayers.id, me.id));
    }
    if (body.wins) {
      await db.update(roomPlayers).set({ wins: sql`${roomPlayers.wins} + 1` }).where(eq(roomPlayers.id, me.id));
    }
    const [r] = await db
      .update(rooms)
      .set({
        state: nextState,
        turn: body.turn === undefined || body.turn === null ? room.turn : Number(body.turn),
        status: String(body.status ?? room.status),
        round: body.round === undefined ? room.round : Number(body.round),
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, room.id))
      .returning();

    if (r.status === "finished" && body.winner) {
      const w = seats.find((s) => s.id === me.id);
      if (w) {
        const user = await currentUser();
        await db.insert(gameScores).values({
          userId: user?.id ?? w.userId,
          playerName: w.name,
          game: room.game,
          score: Number(body.winnerScore ?? 1),
          meta: { room: room.code, multiplayer: true },
        });
      }
    }
    const fresh = await load(code);
    return Response.json({ ok: true, room: publicRoom(r), seats: fresh!.seats.map((s) => publicSeat(s)) });
  }

  if (action === "rematch") {
    await db.update(roomPlayers).set({ score: 0 }).where(eq(roomPlayers.roomId, room.id));
    const [r] = await db
      .update(rooms)
      .set({ status: "playing", turn: Number(body.turn ?? 0), state: (body.state ?? {}) as Record<string, unknown>, round: sql`${rooms.round} + 1`, updatedAt: new Date() })
      .where(eq(rooms.id, room.id))
      .returning();
    const fresh = await load(code);
    return Response.json({ ok: true, room: publicRoom(r), seats: fresh!.seats.map((s) => publicSeat(s)) });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
