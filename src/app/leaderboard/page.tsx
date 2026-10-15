import { PromotionPlacement } from "@/components/ads/PromotionPlacement";
import { db } from "@/db";
import { gameScores, users } from "@/db/schema";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { Shell } from "@/components/term";
import { GAMES } from "@/lib/games";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Agg = { label: string; account: boolean; maxScore: number; plays: number };

export default async function LeaderboardPage() {
  const me = await currentUser();
  let byGame = new Map<string, Agg[]>();
  try {
    // Logged-in players are ranked by account; guests by the name they typed.
    // Blocked accounts are excluded so moderation cannot be gamed.
    const rows = await db
      .select({
        game: gameScores.game,
        userId: gameScores.userId,
        username: users.username,
        playerName: gameScores.playerName,
        blocked: users.blocked,
        score: gameScores.score,
      })
      .from(gameScores)
      .leftJoin(users, eq(users.id, gameScores.userId))
      .orderBy(desc(gameScores.score))
      .limit(4000);

    const agg = new Map<string, Map<string, Agg>>();
    for (const r of rows) {
      if (r.blocked) continue;
      const label = r.username ? `@${r.username}` : `${r.playerName} (guest)`;
      if (!agg.has(r.game)) agg.set(r.game, new Map());
      const g = agg.get(r.game)!;
      const cur = g.get(label);
      if (cur) cur.plays += 1;
      else g.set(label, { label, account: !!r.username, maxScore: r.score, plays: 1 });
    }
    byGame = new Map(
      [...agg.entries()].map(([game, g]) => [
        game,
        [...g.values()].sort((a, b) => b.maxScore - a.maxScore).slice(0, 5),
      ]),
    );
  } catch {
    byGame = new Map();
  }

  const ordered = GAMES.filter((g) => byGame.has(g.id));

  return (
    <Shell path="/leaderboard" title="leaderboard" help="level games: score = highest level cleared. races: score = points. @name = logged in." wide>
      {me && <p className="mb-3">your account: <b>@{me.username}</b> - scores you make while logged in are saved here.</p>}
      {ordered.length === 0 && <p className="dim">no scores yet. go play something.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {ordered.map((g) => (
          <div key={g.id} className="box">
            <p className="font-bold">$ top ./{g.name}</p>
            <pre className="screen mt-2" style={{ lineHeight: 1.6 }}>
              {"#    PLAYER                  SCORE  PLAYS\n"}
              {byGame.get(g.id)!.map((r, i) =>
                `${String(i + 1).padEnd(4)} ${(me && r.label === `@${me.username}` ? ">" : " ")} ${r.label.slice(0, 22).padEnd(22)} ${String(r.maxScore).padStart(5)}  ${String(r.plays).padStart(5)}`,
              ).join("\n")}
            </pre>
          </div>
        ))}
      </div>
      <p className="dim mt-4 text-xs">
        blocked or deleted accounts are removed from this list. guest scores are stored with the name typed in settings.
      </p>
      <PromotionPlacement id="leaderboard-footer" />
    </Shell>
  );
}
