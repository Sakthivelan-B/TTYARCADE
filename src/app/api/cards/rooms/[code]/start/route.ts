import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db as database } from "@/db";
import { cardRooms, cardPlayers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Start the game if there are at least 2 players
export const POST = apiHandler(async function(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  return database.transaction(async (db) => {
  const { code } = await ctx.params;
  const { token } = await readJson(req);
  const upper = code.toUpperCase();

  const [room] = await db
    .select()
    .from(cardRooms)
    .where(eq(cardRooms.code, upper))
    .for("update")
    .limit(1);
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "waiting") {
    return Response.json({ ok: true, status: room.status });
  }

  const players = await db
    .select()
    .from(cardPlayers)
    .where(eq(cardPlayers.roomId, room.id))
    .orderBy(asc(cardPlayers.position));

  if (!token || players[0]?.token !== token) return Response.json({ error: "host only" }, { status: 403 });

  if (players.length < 2) {
    return Response.json({ error: "Need at least 2 players" }, { status: 400 });
  }

  // Ensure first player to move has a playable card, otherwise draw until they do
  // (very rare with 7 cards). Skip for simplicity.

  await db
    .update(cardRooms)
    .set({ status: "playing", updatedAt: new Date() })
    .where(eq(cardRooms.id, room.id));

  return Response.json({ ok: true, status: "playing" });
  });
});
