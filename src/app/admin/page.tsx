"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Stats } from "@/components/term";
import { gameName } from "@/lib/games";

type U = {
  id: number; username: string; isAdmin: boolean; blocked: boolean;
  blockedReason: string | null; createdAt: string; lastLoginAt: string | null;
  plays: number; best: number;
};
type Totals = { userCount: number; blockedCount: number; scoreCount: number; openRooms: number };

export default function AdminPage() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) { setErr(d.error ?? "admin only"); setUsers(null); return; }
    setUsers(d.users);
    setTotals(d.totals);
    setErr(null);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: number, action: string) {
    setBusy(id);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reason: reason[id] ?? "" }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(0);
    if (!r.ok) setErr(d.error ?? "failed");
    load();
  }

  if (err && !users) {
    return (
      <Shell path="/admin" title="admin">
        <div className="box">
          <p>! {err}</p>
          <p className="dim mt-2 text-sm">
            admin access required. admins are set with the ADMIN_USERNAMES env var (see PUBLISHING.md).
          </p>
          <Link href="/login" className="btn mt-3">login</Link>
        </div>
      </Shell>
    );
  }
  if (!users) return <Shell path="/admin" title="admin">loading...</Shell>;

  return (
    <Shell path="/admin" title="admin - users" help="block or remove accounts that harass others. blocking never breaks a live game: the seat is handed to a cpu." wide>
      <Stats items={[
        ["accounts", totals?.userCount ?? 0],
        ["blocked", totals?.blockedCount ?? 0],
        ["score rows", totals?.scoreCount ?? 0],
        ["open rooms", totals?.openRooms ?? 0],
      ]} />

      <div className="mt-4 max-w-full overflow-x-auto">
        <pre className="screen" style={{ lineHeight: 1.9 }}>
          {"ID   NAME                 STATE     PLAYS  BEST   LAST LOGIN\n"}
          {users.map((u) =>
            `${String(u.id).padEnd(4)} ${u.username.padEnd(20)} ${(u.blocked ? "BLOCKED" : u.isAdmin ? "admin" : "ok").padEnd(9)} ${String(u.plays).padStart(5)}  ${String(u.best).padStart(4)}   ${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}`,
          ).join("\n")}
        </pre>
      </div>

      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="box-dashed">
            <p>
              <b>{u.username}</b> <span className="dim">#{u.id} · {u.blocked ? `blocked (${u.blockedReason ?? "no reason"})` : u.isAdmin ? "admin" : "active"} · {u.plays} plays · best {u.best}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!u.blocked ? (
                <>
                  <input
                    className="inp w-56"
                    placeholder="reason (shown to the user)"
                    value={reason[u.id] ?? ""}
                    onChange={(e) => setReason((r) => ({ ...r, [u.id]: e.target.value }))}
                  />
                  <button className="btn" disabled={busy === u.id || u.isAdmin} onClick={() => act(u.id, "block")}>block</button>
                </>
              ) : (
                <button className="btn" disabled={busy === u.id} onClick={() => act(u.id, "unblock")}>unblock</button>
              )}
              <button className="btn" disabled={busy === u.id || u.isAdmin} onClick={() => act(u.id, "wipe-scores")}>wipe scores</button>
              <button className="btn" disabled={busy === u.id || u.isAdmin} onClick={() => { if (confirm(`delete ${u.username} and all their scores?`)) act(u.id, "delete"); }}>delete account</button>
            </div>
          </div>
        ))}
      </div>

      {err && <p className="mt-3">! {err}</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn" onClick={load}>refresh</button>
        <Link href="/" className="btn">back</Link>
      </div>
      <p className="dim mt-4 text-xs">
        what happens on block: sessions are destroyed, the user is dropped from live rooms (their seat becomes a cpu
        so the game continues for everyone else), and their scores stop counting on the leaderboard.
      </p>
    </Shell>
  );
}
