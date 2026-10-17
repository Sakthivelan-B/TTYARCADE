import { encodeRoomPassword } from "@/lib/room-access";
import { rateLimit } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { leaveCards } from "@/lib/room-lifecycle";
import { apiHandler } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { cardRooms, cardPlayers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/cards/rooms/:code?token=...
// Public room state + opponents' card COUNTS. Your own hand is only
// returned when a valid player token is supplied (hands stay secret).
export const GET = apiHandler(async function(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token");
  const [room] = await db
    .select()
    .from(cardRooms)
    .where(eq(cardRooms.code, code.toUpperCase()))
    .limit(1);
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }
  const players = await db
    .select()
    .from(cardPlayers)
    .where(eq(cardPlayers.roomId, room.id))
    .orderBy(cardPlayers.position);

  const me = token ? players.find((p) => p.token === token && !p.isCpu && !p.leftAt) : undefined;
  if (me && me.lastSeen < new Date(Date.now() - 10000)) await db.update(cardPlayers).set({ lastSeen: new Date() }).where(eq(cardPlayers.id, me.id));

  return Response.json({
    room: {
      id: room.id,
      code: room.code,
      hostName: room.hostName,
      passwordRequired: !!room.passwordHash,
      status: room.status,
      turn: room.turn,
      hostPosition: room.hostPosition,
      direction: room.direction,
      topSuit: room.topSuit,
      topRank: room.topRank,
      currentSuit: room.currentSuit,
      winner: room.winner,
      deckCount: (room.deck ?? []).length,
      discardTop: room.discard?.length ? room.discard[room.discard.length - 1] : null,
    },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      handCount: (p.hand ?? []).length,
      isCpu: p.isCpu,
      left: !!p.leftAt,
      online: !p.leftAt && (p.id === me?.id || new Date().getTime() - new Date(p.lastSeen).getTime() < 20_000 || p.isCpu),
    })),
    me: me ? { id: me.id, name: me.name, position: me.position, hand: me.hand } : null,
  });
});

export const POST = apiHandler(async function(req: NextRequest, ctx: { params: Promise<{code: string}> }) {
  const {code} = await ctx.params;
  const body=await readJson(req);
  const {token,action}=body;
  return db.transaction(async tx => {
    const [room] = await tx.select().from(cardRooms).where(eq(cardRooms.code,code.toUpperCase())).for("update");
    if (!room) return Response.json({error:"room not found"},{status:404});
    const players = await tx.select().from(cardPlayers).where(eq(cardPlayers.roomId,room.id)).orderBy(cardPlayers.position);
    const me = players.find(p => p.token === token && !p.isCpu && !p.leftAt);
    if (!me) return Response.json({error:"not in room"},{status:403});
    if (action === "access" || action === "kick") {
      if (me.position !== room.hostPosition) return Response.json({error:"host only"},{status:403});
      if (action === "access") {
        const limited=rateLimit(req,"room-access",60); if(limited)return limited;
        const passwordHash=await encodeRoomPassword(body.passwordEnabled,body.password,room.passwordHash);
        await tx.update(cardRooms).set({passwordHash,updatedAt:new Date()}).where(eq(cardRooms.id,room.id));
      } else {
        const target=players.find(p=>p.id===body.playerId && p.id!==me.id && !p.isCpu && !p.leftAt);
        if (!target) return Response.json({error:"select another human player"},{status:400});
        await leaveCards(tx,room,target,players);
      }
    } else if (action === "close") {
      if (me.position !== room.hostPosition) return Response.json({error:"host only"},{status:403});
      await tx.delete(cardRooms).where(eq(cardRooms.id,room.id));
    } else if (action === "leave") await leaveCards(tx,room,me,players);
    else return Response.json({error:"unknown action"},{status:400});
    return Response.json({ok:true});
  });
});
