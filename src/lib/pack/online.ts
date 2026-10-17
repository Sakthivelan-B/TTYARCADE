import { eq, sql } from "drizzle-orm";
import { rooms, roomPlayers, gameScores } from "@/db/schema";
import type { Transaction } from "../room-lifecycle";
import { publicRoom, publicSeat } from "@/app/api/rooms/route";
import { newPackGame, commandPack, type PackState } from "./index";
import { packGame } from "./catalog";
type Room = typeof rooms.$inferSelect;
type Seat = typeof roomPlayers.$inferSelect;
// The caller owns a SELECT FOR UPDATE room lock for the complete transaction.
export async function packOnlineAction(
  tx: Transaction,
  room: Room,
  seats: Seat[],
  me: Seat,
  body: Record<string, unknown>,
): Promise<Response> {
  const respond = (error: string, status = 409) =>
    Response.json(
      {
        error,
        room: publicRoom(room, me.seat),
        seats: seats.map((s) => publicSeat(s)),
      },
      { status },
    );
  if (body.expectVersion !== undefined && body.expectVersion !== room.version)
    return respond("board updated; try again");
  const def = packGame(room.game);
  if (!def?.modes.includes("online"))
    return respond("online mode is not available", 400);
  const action = String(body.action);
  let next: PackState,
    round = room.round,
    hostSeat = room.hostSeat;
  if (["start", "restart", "rematch"].includes(action)) {
    if (me.seat !== room.hostSeat) return respond("host only", 403);
    if (action === "start" && room.status !== "waiting")
      return respond("already started");
    if (action === "rematch" && room.status !== "finished")
      return respond("round is not finished");
    const humans = seats.filter((s) => !s.isCpu && !s.leftAt);
    if (humans.length < def.min)
      return respond(`need at least ${def.min} human players`, 400);
    for (const seat of seats.filter((s) => s.isCpu || s.leftAt))
      await tx.delete(roomPlayers).where(eq(roomPlayers.id, seat.id));
    for (const [i, seat] of humans.entries()) {
      if (seat.seat === room.hostSeat) hostSeat = i;
      await tx
        .update(roomPlayers)
        .set({ seat: i, score: 0 })
        .where(eq(roomPlayers.id, seat.id));
      seat.seat = i;
    }
    seats = humans;
    me = humans.find((s) => s.id === me.id)!;
    const prior = room.state as unknown as PackState;
    const requested = body.state as
      { options?: { jokers?: boolean } } | undefined;
    const options = {
      jokers: requested?.options?.jokers ?? prior.options?.jokers ?? false,
    };
    next = newPackGame(
      room.game,
      humans.length,
      prior.v === 1 ? prior.level + (prior.phase === "won" ? 1 : 0) : 1,
      options,
    );
    round++;
  } else {
    if (room.status !== "playing") return respond("game is not playing");
    if (action !== "pack-command") return respond("use a game command", 400);
    try {
      next = commandPack(
        room.state as unknown as PackState,
        body.command,
        me.seat,
      );
    } catch (error) {
      return respond(
        error instanceof Error ? error.message : "Invalid move.",
        422,
      );
    }
  }
  const ended = next.phase === "won" || next.phase === "lost";
  const [updated] = await tx
    .update(rooms)
    .set({
      state: next as unknown as Record<string, unknown>,
      turn: next.turn,
      status: ended ? "finished" : "playing",
      round,
      hostSeat,
      version: sql`${rooms.version}+1`,
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, room.id))
    .returning();
  if (ended)
    for (const seat of seats.filter((s) => !s.isCpu && !s.leftAt)) {
      const score = Math.min(1000000, next.scores[seat.seat] ?? 0);
      await tx
        .update(roomPlayers)
        .set({ score, wins: sql`${roomPlayers.wins}+${score > 0 ? 1 : 0}` })
        .where(eq(roomPlayers.id, seat.id));
      if (score > 0)
        await tx.insert(gameScores).values({
          userId: seat.userId,
          playerName: seat.name,
          game: room.game,
          score,
          meta: {
            room: room.code,
            round,
            multiplayer: true,
            serverValidated: true,
          },
        });
    }
  const fresh = await tx
    .select()
    .from(roomPlayers)
    .where(eq(roomPlayers.roomId, room.id))
    .orderBy(roomPlayers.seat);
  return Response.json({
    ok: true,
    room: publicRoom(updated, me.seat),
    seats: fresh.map((s) => publicSeat(s)),
  });
}
