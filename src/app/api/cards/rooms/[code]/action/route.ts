import { NextRequest } from "next/server";
import { db } from "@/db";
import { cardRooms, cardPlayers, gameScores } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { canPlay, getRank, getSuit, shuffle } from "@/lib/cards";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SUITS = ["H", "D", "C", "S"];

/**
 * POST /api/cards/rooms/:code/action
 * { token, action }
 *   play        { card, suit? }   play a card (suit required when the card is an 8)
 *   draw        {}                draw one card, ends the turn
 *   chooseSuit  { suit }          finish an 8 that was played without a suit
 *   cpu         {}                ask the server to play for the cpu whose turn it is
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  let action = String(body.action ?? "");
  const upper = code.toUpperCase();

  const user = await currentUser();
  if (user?.blocked) return Response.json({ error: "account blocked" }, { status: 403 });

  const [room] = await db.select().from(cardRooms).where(eq(cardRooms.code, upper)).limit(1);
  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "playing") return Response.json({ error: "Game not in progress" }, { status: 400 });

  const players = await db
    .select()
    .from(cardPlayers)
    .where(eq(cardPlayers.roomId, room.id))
    .orderBy(asc(cardPlayers.position));
  if (players.length < 2) return Response.json({ error: "Need at least 2 players" }, { status: 400 });

  const requester = players.find((p) => p.token === token);
  if (!requester) return Response.json({ error: "Invalid player token" }, { status: 403 });

  const deck = [...(room.deck ?? [])];
  const discard = [...(room.discard ?? [])];
  const topCard = discard[discard.length - 1] ?? null;
  let direction = room.direction;
  let turn = room.turn;
  let currentSuit: string | null = room.currentSuit;
  let topSuit: string = room.topSuit ?? "";
  let topRank: string = room.topRank ?? "";
  let status = room.status;
  let winner: string | null = room.winner;

  /* ---- cpu turn: the server decides, hands stay secret ---- */
  if (action === "cpu") {
    const cpu = players[room.turn];
    if (!cpu?.isCpu) return Response.json({ error: "not a cpu turn" }, { status: 400 });
    const hand = [...(cpu.hand ?? [])];
    const playable = topCard ? hand.filter((c) => canPlay(c, topCard, currentSuit)) : [];
    if (!playable.length) {
      action = "draw";
    } else {
      // keep 8s for later unless the hand is small
      const nonEights = playable.filter((c) => getRank(c) !== "8");
      const card = nonEights.length && hand.length > 2 ? nonEights[0] : playable[0];
      body.card = card;
      if (getRank(card) === "8") {
        const rest = hand.filter((c) => c !== card);
        const tally: Record<string, number> = { H: 0, D: 0, C: 0, S: 0 };
        rest.forEach((c) => { tally[getSuit(c)] = (tally[getSuit(c)] ?? 0) + 1; });
        body.suit = SUITS.slice().sort((a, b) => tally[b] - tally[a])[0];
      }
      action = "play";
    }
    // from here on the cpu is the acting player
    return apply(players[room.turn]);
  }

  if (players[room.turn].id !== requester.id) {
    return Response.json({ error: "Not your turn" }, { status: 400 });
  }
  return apply(requester);

  async function apply(me: typeof cardPlayers.$inferSelect) {
    const hand = [...(me.hand ?? [])];

    if (action === "play") {
      const card = String(body.card ?? "");
      if (!card || !hand.includes(card)) return Response.json({ error: "Card not in your hand" }, { status: 400 });
      if (!topCard) return Response.json({ error: "No top card" }, { status: 400 });
      if (!canPlay(card, topCard, currentSuit)) return Response.json({ error: "Card not playable" }, { status: 400 });

      hand.splice(hand.indexOf(card), 1);
      discard.push(card);
      topSuit = getSuit(card);
      topRank = getRank(card);
      currentSuit = null;

      if (hand.length === 0) {
        status = "finished";
        winner = me.name;
        const u = me.userId ? await db.select().from(cardPlayers).where(eq(cardPlayers.id, me.id)).limit(1) : null;
        await db.insert(gameScores).values({
          userId: u?.[0]?.userId ?? null,
          playerName: me.name,
          game: "crazy8",
          score: 1,
          meta: { won: true, roomCode: upper, players: players.length },
        });
      } else {
        if (getRank(card) === "8") {
          const suit = String(body.suit ?? "");
          if (!SUITS.includes(suit)) {
            await persist(me, hand);
            return Response.json({ ok: true, needsSuit: true });
          }
          currentSuit = suit;
          topSuit = suit;
        }
        turn = advance(turn, direction, players.length);
      }
    } else if (action === "draw") {
      if (!deck.length) {
        const keep = discard.pop();
        deck.push(...shuffle(discard));
        discard.length = 0;
        if (keep) discard.push(keep);
      }
      if (deck.length) hand.push(deck.shift()!);
      turn = advance(turn, direction, players.length);
    } else if (action === "chooseSuit") {
      const suit = String(body.suit ?? "");
      if (!SUITS.includes(suit)) return Response.json({ error: "Invalid suit" }, { status: 400 });
      currentSuit = suit;
      topSuit = suit;
      if (topCard && getRank(topCard) === "8") turn = advance(turn, direction, players.length);
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    await persist(me, hand);
    return Response.json({ ok: true, status, winner });
  }

  async function persist(me: typeof cardPlayers.$inferSelect, hand: string[]) {
    await db
      .update(cardRooms)
      .set({ deck, discard, direction, turn, currentSuit, topSuit, topRank, status, winner, updatedAt: new Date() })
      .where(eq(cardRooms.id, room!.id));
    await db.update(cardPlayers).set({ hand, lastSeen: new Date() }).where(eq(cardPlayers.id, me.id));
  }
}

function advance(turn: number, direction: number, n: number) {
  return (turn + direction + n) % n;
}
