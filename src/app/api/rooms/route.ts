import { projectPack, type PackState } from '@/lib/pack';
import { encodeRoomPassword } from "@/lib/room-access";
import { rateLimit } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { rooms, roomPlayers } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { GAMES } from "@/lib/games";
import { dedupeName } from "@/lib/bots";
import { newToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let c = "";
  for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export const GET = apiHandler(async function(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  let q = db.select().from(rooms).where(eq(rooms.status, "waiting")).orderBy(desc(rooms.createdAt)).limit(25);
  const list = await q;
  const filtered = game ? list.filter((r) => r.game === game) : list;
  const out = [];
  for (const r of filtered) {
    const seats = await db.select().from(roomPlayers).where(eq(roomPlayers.roomId, r.id)).orderBy(asc(roomPlayers.seat));
    out.push({
      code: r.code,
      game: r.game,
      maxPlayers: r.maxPlayers,
      players: seats.length,
      passwordRequired: !!r.passwordHash,
      humans: seats.filter((s) => !s.isCpu).length,
      names: seats.map((s) => s.name),
    });
  }
  return Response.json({ rooms: out });
});

/** POST /api/rooms { game, name, maxPlayers } -> create room + first seat */
export const POST = apiHandler(async function(req: NextRequest) {
  const body = await readJson(req);
  if (body.passwordEnabled) { const limited=rateLimit(req,"room-access",60); if(limited)return limited; }
  const passwordHash=await encodeRoomPassword(body.passwordEnabled,body.password);
  const game = String(body.game ?? "");
  const info = GAMES.find((g) => g.id === game);
  if (!info || game === "crazy8" || !info.modes.includes("online")) return Response.json({ error: "unknown game" }, { status: 400 });
  const max = Math.max(2, Math.min(info.maxPlayers, Math.floor(Number(body.maxPlayers)) || info.maxPlayers || 2));

  const user = await currentUser(); // null for guests and blocked accounts
  const name = dedupeName(String(body.name ?? user?.username ?? "guest").trim().slice(0, 20) || "guest", []);

  let code = makeCode();
  for (let i = 0; i < 12; i++) {
    const dup = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
    if (!dup.length) break;
    code = makeCode();
  }

  return db.transaction(async (db) => {
  const [room] = await db
    .insert(rooms)
    .values({ passwordHash, code, game, maxPlayers: max, status: "waiting", turn: -1, state: {} })
    .returning();
  const token = newToken();
  const [seat] = await db
    .insert(roomPlayers)
    .values({ roomId: room.id, userId: user?.id ?? null, name, token, seat: 0 })
    .returning();

  return Response.json({ room: publicRoom(room), me: publicSeat(seat, token) });
  });
});

export function publicRoom(r: typeof rooms.$inferSelect, viewer?: number) {
  return {
    code: r.code,
    passwordRequired: !!r.passwordHash,
    game: r.game,
    maxPlayers: r.maxPlayers,
    status: r.status,
    turn: r.turn,
    round: r.round,
    version: r.version,
    hostSeat: r.hostSeat,
    state: projectPack(r.state as unknown as PackState,viewer) as unknown as Record<string,unknown>,
    updatedAt: r.updatedAt,
  };
}

export function publicSeat(s: typeof roomPlayers.$inferSelect, token?: string) {
  return {
    id: s.id,
    name: s.name,
    seat: s.seat,
    isCpu: s.isCpu,
    left: !!s.leftAt,
    score: s.score,
    wins: s.wins,
    online: s.online,
    token: token ?? undefined,
  };
}
