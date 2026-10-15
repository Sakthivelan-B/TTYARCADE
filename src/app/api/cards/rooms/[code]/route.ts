import { NextRequest } from "next/server";
import { db } from "@/db";
import { cardRooms, cardPlayers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/cards/rooms/:code?token=...
// Public room state + opponents' card COUNTS. Your own hand is only
// returned when a valid player token is supplied (hands stay secret).
export async function GET(
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

  const me = token ? players.find((p) => p.token === token) : undefined;

  return Response.json({
    room: {
      id: room.id,
      code: room.code,
      hostName: room.hostName,
      status: room.status,
      turn: room.turn,
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
      online: new Date().getTime() - new Date(p.lastSeen).getTime() < 20_000 || p.isCpu,
    })),
    me: me ? { id: me.id, name: me.name, position: me.position, hand: me.hand } : null,
  });
}
