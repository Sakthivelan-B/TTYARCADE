import { packGame } from '@/lib/pack/catalog';
import { apiHandler } from "@/lib/http";
import { readJson } from "@/lib/http";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { gameScores, users } from "@/db/schema";
import { desc, eq, isNull, and, or } from "drizzle-orm";
import { GAMES } from "@/lib/games";
import { rateLimit } from "@/lib/rate-limit";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST { playerName, game, score, meta } - attaches the logged-in account when present. */
export const POST = apiHandler(async function(req: NextRequest) {
  const limited = rateLimit(req, "scores", 60);
  if (limited) return limited;
  const body = await readJson(req);
  const game = String(body.game ?? "");
  const score = Number(body.score);
  const expansion=packGame(game);
  if(expansion?.modes.includes("online")&&!expansion.modes.includes("solo"))return Response.json({error:"Online expansion scores are recorded by the room server."},{status:400});
  if (!GAMES.some((g) => g.id === game) || typeof body.score !== "number" || !Number.isFinite(score)) {
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
});

export const GET = apiHandler(async function(req: NextRequest) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game");
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
    .where(and(game ? eq(gameScores.game, game) : undefined, or(isNull(users.id), eq(users.blocked, false))))
    .orderBy(desc(gameScores.score), desc(gameScores.createdAt))
    .limit(20);
  return Response.json({ scores: rows });
});
