"use client";
import { storage } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, Banner } from "@/components/term";
import { PlayingCard, CardBack, SUIT_TEXT } from "@/components/Card";
import { canPlay, getRank } from "@/lib/cards";
import { usePlayerName } from "@/lib/player";

type Room = {
  code: string;
  hostName: string;
  status: "waiting" | "playing" | "finished";
  turn: number;
  hostPosition: number;
  direction: number;
  currentSuit: string | null;
  winner: string | null;
  deckCount: number;
  discardTop: string | null;
};
type Opp = { id: number; name: string; position: number; handCount: number; isCpu?: boolean; online?: boolean };
type Me = { id: number; name: string; position: number; hand: string[] };

const tokenKey = (code: string) => `ttyarcade-c8:${code}`;

export default function CrazyEights() {
  const polling = useRef(false);
  const posting = useRef(false);
  const [name, setName] = usePlayerName();
  const [code, setCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Opp[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [eight, setEight] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Prefill join code from ?code= and resume saved session
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) {
      const up = c.toUpperCase();
      setJoinCode(up);
      const t = storage.getItem(tokenKey(up));
      if (t) {
        setCode(up);
        setToken(t);
      }
    }
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (polling.current) return;
    polling.current = true;
    try {
    if (!code) return;
    const res = await fetch(`/api/cards/rooms/${code}?token=${token ?? ""}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
    if (signal?.aborted) return;
    if (!res.ok) {
      setErr(res.status === 404 ? "room closed by host or all players left" : "room service unavailable");
      if (res.status === 404) { setRoom(null); setMe(null); }
      return;
    }
    const d = await res.json();
    if (signal?.aborted) return;
    setRoom((prev) => {
      if (prev && d.room.discardTop !== prev.discardTop && d.room.discardTop) {
        setLog((l) => [`top card -> ${d.room.discardTop}`, ...l].slice(0, 6));
      }
      return d.room;
    });
    setPlayers(d.players);
    setMe(d.me);
    } catch { if (!signal?.aborted) setErr("network unavailable; try again"); }
    finally { polling.current = false; }
  }, [code, token]);

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const t = setInterval(() => { void refresh(controller.signal); }, 1500);
    return () => { clearInterval(t); controller.abort(); };
  }, [code, refresh]);

  function enter(c: string, t: string) {
    storage.setItem(tokenKey(c), t);
    setCode(c);
    setToken(t);
    window.history.replaceState(null, "", `/games/crazy8?code=${c}`);
  }

  async function create() {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
    setErr(null);
    const res = await fetch("/api/cards/rooms", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: name }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error ?? "failed");
    enter(d.room.code, d.player.token);
    } catch { setErr("network unavailable; try again"); } finally { posting.current = false; setBusy(false); }
  }

  async function join() {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
    setErr(null);
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 5) return setErr("room code is 5 characters");
    const saved = storage.getItem(tokenKey(c));
    if (saved) return enter(c, saved);
    const res = await fetch(`/api/cards/rooms/${c}/join`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error ?? "failed to join");
    enter(c, d.player.token);
    } catch { setErr("network unavailable; try again"); } finally { posting.current = false; setBusy(false); }
  }

  async function act(body: Record<string, unknown>, path = "action") {
    if (!code || posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
    setErr(null);
    const res = await fetch(`/api/cards/rooms/${code}/${path}`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, expectTurn: room?.turn, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setErr(d.error ?? "error");
    setBusy(false);
    refresh();
    } catch { setErr("network unavailable; try again"); } finally { posting.current = false; setBusy(false); }
  }

  // CPU seats play by themselves: the server decides their card, so their
  // hands stay secret. Any client may nudge the server; duplicates are rejected.
  useEffect(() => {
    if (!room || room.status !== "playing" || !me) return;
    const cur = players[room.turn];
    if (!cur?.isCpu) return;
    const t = setTimeout(() => act({ action: "cpu" }), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.turn, room?.status, players.length, room?.discardTop]);

  async function addCpu() {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
    if (!code) return;
    setBusy(true);
    const res = await fetch(`/api/cards/rooms/${code}/join`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpu: true, token }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setErr(d.error ?? "could not add player");
    setBusy(false);
    refresh();
    } catch { setErr("network unavailable; try again"); } finally { posting.current = false; setBusy(false); }
  }

  async function exit(action: "leave" | "close") {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
      if (code) {
        const res = await fetch(`/api/cards/rooms/${code}`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({token,action}), signal: AbortSignal.timeout(10000) });
        if (!res.ok && res.status !== 404) { setErr("could not leave room; try again"); return; }
        storage.removeItem(tokenKey(code));
      }
      setCode(null); setToken(null); setRoom(null); setMe(null); setPlayers([]); setErr(null);
      window.history.replaceState(null, "", "/games/crazy8");
    } catch { setErr("network unavailable; your room session is retained"); }
    finally { posting.current = false; setBusy(false); }
  }
  function leave() { void exit("leave"); }
  function closeRoom() { if (window.confirm("close this room for every player?")) void exit("close"); }

  // ---------- screens ----------
  if (!code) {
    return (
      <Shell path="/games/crazy8" title="crazy eights" help="2-10 players online. match suit or rank. 8s are wild.">
        <div className="box">
          <p>
            <span className="dim">player name:</span>{" "}
            <input className="inp" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="dim text-sm">$ new-room</p>
              <button className="btn mt-1" disabled={busy} onClick={create}>create room</button>
            </div>
            <div>
              <p className="dim text-sm">$ join-room CODE</p>
              <form
                className="mt-1 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  join();
                }}
              >
                <input
                  className="inp w-28 uppercase tracking-widest"
                  value={joinCode}
                  maxLength={5}
                  placeholder="ABCDE"
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button className="btn" disabled={busy}>join</button>
              </form>
            </div>
          </div>
          {err && <p className="mt-3">! error: {err}</p>}
        </div>
        <p className="mt-3 text-sm">
          <Link href="/games/crazy8/rules" className="underline">man crazy8</Link>{" "}
          <span className="dim">- read the rules</span>
        </p>
      </Shell>
    );
  }

  if (!room) {
    return (
      <Shell path="/games/crazy8" title="crazy eights">
        <p>connecting to room {code}...</p>
        {err && <Banner title={err} action="back" onAction={leave} />}
      </Shell>
    );
  }

  if (!me) {
    return (
      <Shell path="/games/crazy8" title="crazy eights">
        <Banner title="you are not in this room" lines={["the session token was not found."]} action="back to menu" onAction={leave} />
      </Shell>
    );
  }

  if (room.status === "waiting") {
    return (
      <Shell path={`/games/crazy8/${room.code}`} title="lobby">
        <div className="box">
          <p className="dim text-sm">room code - share it:</p>
          <p className="text-4xl font-bold tracking-[0.4em]">{room.code}</p>
          <p className="dim mt-1 text-xs">
            or share link: /games/crazy8?code={room.code}
          </p>
          <p className="mt-4 dim text-sm">players ({players.length}/10):</p>
          {players.map((p) => (
            <p key={p.id}>
              [{p.position + 1}] {p.name}
              {p.isCpu && <span className="dim"> *cpu</span>}
              {p.id === me.id && <b> (you)</b>}
              {p.position === room.hostPosition && <span className="dim"> host</span>}
              {!p.isCpu && p.online === false && <span className="dim"> (offline)</span>}
            </p>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" disabled={players.length < 2 || busy || me.position !== room.hostPosition} onClick={() => act({}, "start")}>
              start game
            </button>
            {me.position === room.hostPosition && players.length < 10 && (
              <button className="btn" disabled={busy} onClick={addCpu}>+ add player</button>
            )}
            <button className="btn" disabled={busy} onClick={leave}>leave</button>
            {me.position === room.hostPosition && <button className="btn" disabled={busy} onClick={closeRoom}>close room</button>}
          </div>
          <p className="dim mt-2 text-xs">
            2 decks are used, so up to 10 players fit. &quot;+ add player&quot; seats a random-named cpu that plays
            properly; if a real person joins later they take that seat over.
          </p>
          {players.length < 2 && <p className="dim mt-2 text-sm">waiting for at least 2 players<span className="blink">...</span></p>}
          {err && <p className="mt-2">! {err}</p>}
        </div>
      </Shell>
    );
  }

  const myTurn = players[room.turn]?.id === me.id;
  const turnName = players[room.turn]?.name ?? "?";
  const top = room.discardTop;
  const isPlayable = (c: string) => !!top && canPlay(c, top, room.currentSuit);
  const hand = [...me.hand].sort();

  function clickCard(c: string) {
    if (!myTurn || !isPlayable(c)) return;
    if (getRank(c) === "8") setEight(c);
    else act({ action: "play", card: c });
  }

  return (
    <Shell path={`/games/crazy8/${room.code}`} title="crazy eights" wide>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>room=<b>{room.code}</b> <span className="dim">deck={room.deckCount}</span></span>
        <span className={myTurn ? "inv px-2" : ""}>
          {room.status === "finished" ? `winner: ${room.winner}` : myTurn ? ">> YOUR TURN <<" : `waiting for ${turnName}...`}
        </span>
        <button className="btn" style={{ padding: "0 6px" }} disabled={busy} onClick={leave}>exit</button>
        {me.position === room.hostPosition && <button className="btn" disabled={busy} onClick={closeRoom}>close room</button>}
      </div>

      {room.status === "finished" ? (
        <Banner
          title={room.winner === me.name ? "YOU WIN." : `${room.winner} wins.`}
          lines={["game over. create a new room for a rematch."]}
          action="new game"
          onAction={leave}
        />
      ) : (
        <>
          {/* opponents */}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {players
              .filter((p) => p.id !== me.id)
              .map((p) => {
                const active = players[room.turn]?.id === p.id;
                return (
                  <div key={p.id} className={active ? "box inv" : "box"}>
                    <p>{active ? "> " : "  "}{p.name}{p.isCpu ? "*" : ""}{p.online === false && !p.isCpu ? " (offline)" : ""}</p>
                    <p className="text-sm">{"[#]".repeat(Math.min(p.handCount, 10))}{p.handCount > 10 ? "+" : ""} <span>{p.handCount} cards</span></p>
                  </div>
                );
              })}
          </div>

          {/* table */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              onClick={() => myTurn && act({ action: "draw" })}
              disabled={!myTurn || busy}
              className="flex flex-col items-center gap-1 disabled:line-through"
              title="draw a card"
            >
              <CardBack />
              <span className="text-xs">[draw]</span>
            </button>
            <div className="flex flex-col items-center gap-1">
              {top && <PlayingCard card={top} big playable />}
              <span className="text-xs dim">
                {room.currentSuit ? `suit set to ${SUIT_TEXT[room.currentSuit]}` : "discard"}
              </span>
            </div>
          </div>

          {/* hand */}
          <p className="mt-6 text-sm dim">your hand ({hand.length}) - double border = playable</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {hand.map((c, index) => (
              <PlayingCard
                key={`${c}-${index}`}
                card={c}
                playable={myTurn && isPlayable(c)}
                onClick={myTurn && isPlayable(c) ? () => clickCard(c) : undefined}
              />
            ))}
          </div>
          {myTurn && !hand.some(isPlayable) && <p className="mt-2 text-sm">no playable card - press [draw].</p>}

          {eight && (
            <div className="box mt-4">
              <p>you played an 8. choose next suit:</p>
              <div className="mt-2 flex gap-2">
                {(["H", "D", "C", "S"] as const).map((s) => (
                  <button
                    key={s}
                    className="btn text-xl"
                    onClick={() => {
                      act({ action: "play", card: eight, suit: s });
                      setEight(null);
                    }}
                  >
                    {SUIT_TEXT[s]}
                  </button>
                ))}
                <button className="btn" onClick={() => setEight(null)}>cancel</button>
              </div>
            </div>
          )}

          {err && <p className="mt-3">! {err}</p>}
          {log.length > 0 && (
            <div className="box-dashed mt-6 text-xs dim">
              {log.map((l, i) => <p key={i}>$ {l}</p>)}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
