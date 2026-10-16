import { NextRequest } from "next/server";
import { apiHandler, readJson } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { touchActivity } from "@/lib/activity";
import { GAMES } from "@/lib/games";
import { rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export const POST = apiHandler(async function(req: NextRequest) {
  const limited = rateLimit(req, "activity", 60);
  if (limited) return limited;
  const { game } = await readJson(req);
  if (!GAMES.some(g => g.id === game)) return Response.json({ error: "unknown game" }, { status: 400 });
  const user = await currentUser();
  await touchActivity(user?.id);
  return new Response(null, { status: 204 }); // guests never need an account
});
