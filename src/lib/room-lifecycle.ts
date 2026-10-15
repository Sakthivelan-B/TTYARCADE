import { db } from "@/db";
import { rooms, roomPlayers, cardRooms, cardPlayers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { newToken } from "./auth";
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
// Called only for an authenticated explicit leave, under a room-row lock.
export async function leaveGeneric(tx: Transaction, room: typeof rooms.$inferSelect, me: typeof roomPlayers.$inferSelect, seats: (typeof roomPlayers.$inferSelect)[]) {
  const humans = seats.filter(s => s.id !== me.id && !s.isCpu && !s.leftAt);
  if (!humans.length) { await tx.delete(rooms).where(eq(rooms.id, room.id)); return; }
  if (room.status === "waiting") {
    await tx.delete(roomPlayers).where(eq(roomPlayers.id, me.id));
    const remaining = seats.filter(s => s.id !== me.id);
    for (const [i,s] of remaining.entries()) await tx.update(roomPlayers).set({ seat: i }).where(eq(roomPlayers.id,s.id));
    await tx.update(rooms).set({ version:sql`${rooms.version}+1`, hostSeat: remaining.findIndex(s => s.id === (me.seat === room.hostSeat ? humans[0].id : seats.find(s => s.seat === room.hostSeat)?.id)), updatedAt: new Date() }).where(eq(rooms.id, room.id));
  } else {
    // Preserve array/board positions. Explicitly departed seats are not sessions.
    await tx.update(roomPlayers).set({ leftAt: new Date(), isCpu: true, online: false, userId: null, token: newToken() }).where(eq(roomPlayers.id,me.id));
    const turn = room.turn === me.seat && !["tictactoe","connect4"].includes(room.game) ? humans[0].seat : room.turn;
    await tx.update(rooms).set({ version:sql`${rooms.version}+1`, hostSeat: me.seat === room.hostSeat ? humans[0].seat : room.hostSeat, turn, state: room.game === "memory" ? { ...room.state, turn, ...(room.turn === me.seat ? {open:[],resolveAt:null} : {}) } : room.state, updatedAt: new Date() }).where(eq(rooms.id,room.id));
  }
}
export async function leaveCards(tx: Transaction, room: typeof cardRooms.$inferSelect, me: typeof cardPlayers.$inferSelect, players: (typeof cardPlayers.$inferSelect)[]) {
  const humans = players.filter(s => s.id !== me.id && !s.isCpu && !s.leftAt);
  if (!humans.length) { await tx.delete(cardRooms).where(eq(cardRooms.id,room.id)); return; }
  // Keep the hand and all 104 cards intact; this explicit leave enables the CPU.
  await tx.update(cardPlayers).set({ leftAt: new Date(), isCpu: true, userId: null, token: newToken() }).where(eq(cardPlayers.id,me.id));
  await tx.update(cardRooms).set({ hostPosition: me.position === room.hostPosition ? humans[0].position : room.hostPosition, updatedAt: new Date() }).where(eq(cardRooms.id,room.id));
}
