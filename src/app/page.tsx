import { GameTabNotice } from "@/lib/game-tab";
import { PromotionPlacement } from "@/components/ads/PromotionPlacement";
import Link from "next/link";
import { Shell } from "@/components/term";
import { GAMES } from "@/lib/games";
import { GameCatalog } from "@/components/game-catalog";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BANNER = String.raw`
  _   _                                 _
 | |_| |_ _   _  __ _ _ __ ___ __ _  __| | ___
 | __| __| | | |/ _' | '__/ __/ _' |/ _' |/ _ \
 | |_| |_| |_| | (_| | | | (_| (_| | (_| |  __/
  \__|\__|\__, |\__,_|_|  \___\__,_|\__,_|\___|
          |___/
`;

export default async function HomePage() {
  const user = await currentUser();

  return (
    <Shell path="" back={null} wide>
      <GameTabNotice />
      <pre className="screen hidden text-xs sm:block">{BANNER}</pre>
      <p className="mt-2">
        text-only arcade. no images, no colors, instant load.{" "}
        <span className="dim">{GAMES.length} games installed.</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {user ? (
          <>
            <Link href="/account" className="btn">account: {user.username}</Link>
            {user.isAdmin && <Link href="/admin" className="btn">admin</Link>}
          </>
        ) : (
          <>
            <Link href="/login" className="btn">login</Link>
            <Link href="/login?mode=register" className="btn">create account</Link>
            <span className="dim self-center">- log in to keep your scores on this site</span>
          </>
        )}
        <Link href="/leaderboard" className="btn">leaderboard</Link>
        <Link href="/settings" className="btn">settings / controls</Link>
      </div>

      <p className="mt-5">$ ls -la ./games</p>

      <GameCatalog />

      <p className="dim mt-6 text-xs">
        keys: arrows/WASD move, enter submits - remap everything (including a joystick) in settings.
      </p>
      <PromotionPlacement id="home-footer" />
    </Shell>
  );
}
