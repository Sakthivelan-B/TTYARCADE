import { readJson } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { apiHandler } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { cardRooms, cardPlayers } from "@/db/schema";
import { buildDeck, shuffle, generateRoomCode, generateToken, getRank, getSuit } from "@/lib/cards";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function(req: NextRequest) {
  const { hostName } = await readJson(req);
  if (!hostName || typeof hostName !== "string") {
    return Response.json({ error: "hostName required" }, { status: 400 });
  }
  const name = hostName.trim().slice(0, 20) || "Player";

  let code = generateRoomCode();
  for (let i = 0; i < 10; i++) {
    const existing = await db
      .select()
      .from(cardRooms)
      .where(eq(cardRooms.code, code))
      .limit(1);
    if (existing.length === 0) break;
    code = generateRoomCode();
  }

  // Two shuffled decks so the room can hold up to 10 players (7 cards each).
  const deck = shuffle(buildDeck(2));

  // Deal 7 cards to host
  const hand = deck.splice(0, 7);
  // Flip one to discard
  let firstDiscard = deck.shift()!;
  // Ensure first discard is not an 8
  let guard = 0;
  while (getRank(firstDiscard) === "8" && deck.length > 0 && guard < 100) {
    deck.push(firstDiscard);
    firstDiscard = deck.shift()!;
    guard++;
  }
  const discard = [firstDiscard];

  const user = await currentUser();
  return db.transaction(async (db) => {
  const [room] = await db
    .insert(cardRooms)
    .values({
      code,
      hostName: name,
      status: "waiting",
      turn: 0,
      direction: 1,
      topSuit: getSuit(firstDiscard),
      topRank: getRank(firstDiscard),
      deck,
      discard,
      currentSuit: null,
    })
    .returning();

  const token = generateToken();
  const [player] = await db
    .insert(cardPlayers)
    .values({
      roomId: room.id,
      userId: user?.id ?? null,
      name,
      token,
      hand,
      position: 0,
    })
    .returning();

  return Response.json({
    room: serializeRoom(room),
    player: { id: player.id, name: player.name, token: player.token, hand: player.hand, position: player.position },
  });
  });
});

export const GET = apiHandler(async function() {
  const rooms = await db
    .select()
    .from(cardRooms)
    .where(eq(cardRooms.status, "waiting"))
    .orderBy(desc(cardRooms.createdAt))
    .limit(10);
  return Response.json({ rooms: rooms.map(serializeRoom) });
});

function serializeRoom(r: typeof cardRooms.$inferSelect) {
  return {
    id: r.id,
    code: r.code,
    hostName: r.hostName,
    status: r.status,
    turn: r.turn,
    direction: r.direction,
    topSuit: r.topSuit,
    topRank: r.topRank,
    currentSuit: r.currentSuit,
    winner: r.winner,
    discardCount: (r.discard ?? []).length,
    deckCount: (r.deck ?? []).length,
  };
}
