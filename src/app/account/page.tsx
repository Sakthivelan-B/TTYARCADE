"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, Stats } from "@/components/term";
import { gameName } from "@/lib/games";

type Me = { id: number; username: string; isAdmin: boolean; createdAt: string };
type Score = { id: number; game: string; score: number; meta: unknown; createdAt: string };

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [stats, setStats] = useState<{ plays: number; best: number; rank: number } | null>(null);
  const [recent, setRecent] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    const d = await r.json();
    setUser(d.user);
    setStats(d.stats ?? null);
    setRecent(d.recent ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function logout() {
    await fetch("/api/auth/me", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) return <Shell path="/account" title="account">loading...</Shell>;
  if (!user) {
    return (
      <Shell path="/account" title="account" help="you are playing as a guest.">
        <div className="box">
          <p>not logged in. guests keep scores in this browser only.</p>
          <p className="mt-3 flex gap-2">
            <Link href="/login" className="btn">login</Link>
            <Link href="/login?mode=register" className="btn">create account</Link>
            <Link href="/" className="btn">back</Link>
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell path="/account" title={`account: ${user.username}`}>
      <Stats items={[
        ["member since", new Date(user.createdAt).toLocaleDateString()],
        ["games played", stats?.plays ?? 0],
        ["best single score", stats?.best ?? 0],
        ["site rank", stats?.rank ? `#${stats.rank}` : "-"],
      ]} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/leaderboard" className="btn">leaderboard</Link>
        <Link href="/settings" className="btn">settings / controls</Link>
        {user.isAdmin && <Link href="/admin" className="btn">admin panel</Link>}
        <button className="btn" onClick={logout}>log out</button>
      </div>

      <div className="box mt-4">
        <p className="font-bold">$ tail -n 15 ~/scores.log</p>
        {recent.length === 0 ? (
          <p className="dim mt-2">no scores yet - play a game while logged in and they land here.</p>
        ) : (
          <pre className="screen mt-2" style={{ lineHeight: 1.7 }}>
            {"GAME                 SCORE  WHEN\n"}
            {recent.map((s) =>
              `${gameName(s.game).padEnd(20)} ${String(s.score).padStart(5)}  ${new Date(s.createdAt).toLocaleString()}`,
            ).join("\n")}
          </pre>
        )}
      </div>
      {err && <p className="mt-2">! {err}</p>}
      <p className="dim mt-4 text-xs">
        moderation: an admin can block or delete an account that breaks the rules. blocking removes you from live
        rooms (your seat is handed to a cpu so the other players can finish) and hides your scores from the leaderboard.
      </p>
    </Shell>
  );
}
