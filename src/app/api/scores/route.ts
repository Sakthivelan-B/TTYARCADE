import { NextRequest } from "next/server";
import { db } from "@/db";
import { gameScores, users } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST { playerName, game, score, meta } - attaches the logged-in account when present. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const game = String(body.game ?? "");
  const score = Number(body.score);
  if (!game || !Number.isFinite(score)) {
    return Response.json({ error: "game and numeric score required" }, { status: 400 });
  }
  const user = await currentUser(); // null for guests and blocked accounts
  const [row] = await db
    .insert(gameScores)
    .values({
      userId: user?.id ?? null,
      // the account name wins over whatever the browser claims
      playerName: (user?.username ?? String(body.playerName ?? "guest")).slice(0, 20),
      game: game.slice(0, 32),
      score: Math.max(-1_000_000, Math.min(1_000_000, Math.round(score))),
      meta: (body.meta as Record<string, unknown> | undefined) ?? null,
    })
    .returning();
  return Response.json({ ok: true, id: row.id, attributed: !!user });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game");
  if (!game) {
    const all = await db
      .select()
      .from(gameScores)
      .orderBy(desc(gameScores.createdAt))
      .limit(50);
    return Response.json({ scores: all });
  }
  const rows = await db
    .select({
      id: gameScores.id,
      playerName: gameScores.playerName,
      username: users.username,
      score: gameScores.score,
      meta: gameScores.meta,
      createdAt: gameScores.createdAt,
    })
    .from(gameScores)
    .leftJoin(users, eq(users.id, gameScores.userId))
    .where(eq(gameScores.game, game))
    .orderBy(desc(gameScores.score), desc(gameScores.createdAt))
    .limit(20);
  return Response.json({ scores: rows });
}
