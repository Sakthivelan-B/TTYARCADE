import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db as database } from "@/db";
import { cardRooms, cardPlayers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateToken } from "@/lib/cards";
import { dedupeName, uniqueCpuName } from "@/lib/bots";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  return database.transaction(async (db) => {
  const { code } = await ctx.params;
  const body = await readJson(req);
  const wantsCpu = body.cpu === true;
  const upper = code.toUpperCase();

  const user = await currentUser();
  if (user?.blocked) return Response.json({ error: "account blocked" }, { status: 403 });

  const [room] = await db.select().from(cardRooms).where(eq(cardRooms.code, upper)).for("update").limit(1);
  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });
  if (room.status === "finished") return Response.json({ error: "Game finished" }, { status: 400 });

  const existing = await db
    .select()
    .from(cardPlayers)
    .where(eq(cardPlayers.roomId, room.id))
    .orderBy(desc(cardPlayers.position));

  // only the host (seat 0) may add cpu players
  if (wantsCpu) {
    const hostToken = String(body.token ?? "");
    if (existing[existing.length - 1]?.token !== hostToken && !existing.some((p) => p.position === 0 && p.token === hostToken)) {
      return Response.json({ error: "only the host can add cpu players" }, { status: 403 });
    }
  }

  // reconnect instead of duplicating a seat
  const cleanName = wantsCpu
    ? uniqueCpuName(existing.map((p) => p.name))
    : dedupeName(
        String(body.name ?? user?.username ?? "guest").trim().slice(0, 20) || "guest",
        existing.map((p) => p.name),
      );
  if (!wantsCpu) {
    // Reconnect only with the seat's own token or the same logged-in account.
    // A matching display name alone must never hand out someone's seat/hand.
    const ownToken = typeof body.token === "string" && body.token.length > 0 ? body.token : null;
    const again = existing.find(
      (p) => !p.isCpu && ((ownToken !== null && p.token === ownToken) || (!!user && p.userId === user.id)),
    );
    if (again) {
      await db.update(cardPlayers).set({ lastSeen: new Date() }).where(eq(cardPlayers.id, again.id));
      return Response.json({ player: publicPlayer(again) });
    }
    // take over a cpu seat when a real player arrives mid-game
    const cpuSeat = existing.find((p) => p.isCpu);
    if (cpuSeat && room.status === "playing") {
      const deck = [...(room.deck ?? [])];
      const token = generateToken();
      const hand = (cpuSeat.hand ?? []).length ? cpuSeat.hand : deck.splice(0, 7);
      const [p] = await db
        .update(cardPlayers)
        .set({ name: cleanName, token, isCpu: false, hand, userId: user?.id ?? null, lastSeen: new Date() })
        .where(eq(cardPlayers.id, cpuSeat.id))
        .returning();
      if (deck.length !== (room.deck ?? []).length) {
        await db.update(cardRooms).set({ deck, updatedAt: new Date() }).where(eq(cardRooms.id, room.id));
      }
      return Response.json({ player: publicPlayer(p) });
    }
  }

  // Deal inside a transaction with the room row locked, so two people joining
  // at the same moment can never be dealt the same cards or the same seat.
  const token = generateToken();
  const result = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(cardRooms).where(eq(cardRooms.id, room.id)).for("update").limit(1);
    if (!locked) return { error: "Room not found", status: 404 } as const;
    const seated = await tx.select().from(cardPlayers).where(eq(cardPlayers.roomId, room.id));
    if (seated.length >= 10) return { error: "Room is full (10 players)", status: 400 } as const;
    const position = seated.length ? Math.max(...seated.map((p) => p.position)) + 1 : 0;
    const deck = [...(locked.deck ?? [])];
    const hand = deck.splice(0, 7);
    await tx.update(cardRooms).set({ deck, updatedAt: new Date() }).where(eq(cardRooms.id, room.id));
    const [player] = await tx
      .insert(cardPlayers)
      .values({
        roomId: room.id,
        userId: wantsCpu ? null : user?.id ?? null,
        name: wantsCpu ? cleanName : dedupeName(cleanName, seated.map((p) => p.name)),
        token,
        hand,
        position,
        isCpu: wantsCpu,
      })
      .returning();
    return { player } as const;
  });
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });

  return Response.json({ player: publicPlayer(result.player) });
  });
});

function publicPlayer(p: typeof cardPlayers.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    token: p.token,
    position: p.position,
    isCpu: p.isCpu,
    hand: p.hand,
  };
}
