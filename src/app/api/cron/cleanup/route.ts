import { apiHandler } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Reversible inactivity flags + expired sessions. No account/game/room purge.
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>"
// (schedule in vercel.json). Any other scheduler can call it the same way.
export const GET = apiHandler(async function(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await db.transaction(async tx => {
    const flags = await tx.execute<{ flagged: number }>(sql`SELECT flag_inactive_accounts() AS flagged`);
    const expired = await tx.execute(sql`DELETE FROM sessions WHERE expires_at < now()`);
    return { flaggedAccounts: Number(flags.rows[0]?.flagged ?? 0), deletedSessions: expired.rowCount ?? 0 };
  });
  return Response.json({ ok: true, ...result, deletedRooms: 0 });
});
