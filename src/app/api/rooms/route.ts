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

export async function GET(req: NextRequest) {
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
      humans: seats.filter((s) => !s.isCpu).length,
      names: seats.map((s) => s.name),
    });
  }
  return Response.json({ rooms: out });
}

/** POST /api/rooms { game, name, maxPlayers } -> create room + first seat */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const game = String(body.game ?? "");
  const info = GAMES.find((g) => g.id === game);
  if (!info) return Response.json({ error: "unknown game" }, { status: 400 });
  const max = Math.max(2, Math.min(10, Number(body.maxPlayers) || info.maxPlayers || 2));

  const user = await currentUser(); // null for guests and blocked accounts
  const name = dedupeName(String(body.name ?? user?.username ?? "guest").trim().slice(0, 20) || "guest", []);

  let code = makeCode();
  for (let i = 0; i < 12; i++) {
    const dup = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
    if (!dup.length) break;
    code = makeCode();
  }

  const [room] = await db
    .insert(rooms)
    .values({ code, game, maxPlayers: max, status: "waiting", turn: -1, state: {} })
    .returning();
  const token = newToken();
  const [seat] = await db
    .insert(roomPlayers)
    .values({ roomId: room.id, userId: user?.id ?? null, name, token, seat: 0 })
    .returning();

  return Response.json({ room: publicRoom(room), me: publicSeat(seat, token) });
}

export function publicRoom(r: typeof rooms.$inferSelect) {
  return {
    code: r.code,
    game: r.game,
    maxPlayers: r.maxPlayers,
    status: r.status,
    turn: r.turn,
    round: r.round,
    state: r.state,
    updatedAt: r.updatedAt,
  };
}

export function publicSeat(s: typeof roomPlayers.$inferSelect, token?: string) {
  return {
    id: s.id,
    name: s.name,
    seat: s.seat,
    isCpu: s.isCpu,
    score: s.score,
    wins: s.wins,
    online: s.online,
    token: token ?? undefined,
  };
}
