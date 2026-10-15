import { NextRequest } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Daily housekeeping so the free database tier never fills up.
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>"
// (schedule in vercel.json). Any other scheduler can call it the same way.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  // Rooms idle for 6h are abandoned. Seats are removed by ON DELETE CASCADE.
  const rooms = await db.execute(sql`DELETE FROM rooms WHERE updated_at < now() - interval '6 hours'`);
  const cardRooms = await db.execute(sql`DELETE FROM card_rooms WHERE updated_at < now() - interval '6 hours'`);
  const sessions = await db.execute(sql`DELETE FROM sessions WHERE expires_at < now()`);
  return Response.json({
    ok: true,
    deleted: {
      rooms: rooms.rowCount ?? 0,
      cardRooms: cardRooms.rowCount ?? 0,
      sessions: sessions.rowCount ?? 0,
    },
  });
}
