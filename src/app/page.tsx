import { GameTabNotice } from "@/lib/game-tab";
import { PromotionPlacement } from "@/components/ads/PromotionPlacement";
import Link from "next/link";
import { Shell } from "@/components/term";
import { GAMES, KIND_LABEL, MODE_LABEL, type GameKind } from "@/lib/games";
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
  const kinds: GameKind[] = ["multi", "levels", "classic"];

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

      {kinds.map((k) => (
        <section key={k} className="mt-4">
          <p className="dim text-sm">-- {KIND_LABEL[k]} --</p>
          <div className="mt-1">
            {GAMES.filter((g) => g.kind === k).map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="group grid grid-cols-[1.2rem_11rem_1fr] gap-2 px-1 py-0.5 hover:no-underline sm:grid-cols-[1.2rem_11rem_12rem_1fr]"
              >
                <span className="dim group-hover:text-[var(--fg)]">&gt;</span>
                <span className="font-bold group-hover:underline">./{g.name}</span>
                <span className="dim hidden text-xs sm:inline">
                  [{g.modes.map((m) => MODE_LABEL[m]).join(", ")}
                  {g.maxPlayers > 1 ? ` · ${g.minPlayers}-${g.maxPlayers}p` : ""}]
                </span>
                <span className="dim col-span-2 col-start-2 text-xs sm:col-span-1 sm:col-start-auto sm:text-sm">
                  {g.desc}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <p className="dim mt-6 text-xs">
        keys: arrows/WASD move, enter submits - remap everything (including a joystick) in settings.
      </p>
      <PromotionPlacement id="home-footer" />
    </Shell>
  );
}
