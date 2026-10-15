"use client";
import { HostRoomControls, PasswordOption } from "./room-access";
import { storage } from "@/lib/storage";
// Shared multiplayer client: create / join / list rooms, CPU fill with random
// names, polling, presence (online/offline) and CPU takeover of dead seats.
//
// Every game uses the same flow:
//   const m = useRoom("tictactoe", 2);
//   m.create() | m.join(code) | m.addBots(n) | m.start(state) | m.move({...})
//
// CPU seats are driven by the game: when it is a CPU's turn, call
// m.driveCpu(cb) - the hook runs cb once per CPU turn and posts the result.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerName } from "@/lib/player";

export type Seat = {
  id: number;
  name: string;
  seat: number;
  isCpu: boolean;
  score: number;
  wins: number;
  online: boolean;
  token?: string;
  left?: boolean;
};
export type Room = {
  code: string;
  game: string;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  turn: number;
  round: number;
  hostSeat: number;
  version: number;
  passwordRequired: boolean;
  state: Record<string, unknown>;
};

const tokKey = (code: string) => `ttyarcade-room:${code}`;

export function useRoom(game: string, maxPlayers: number) {
  const [name] = usePlayerName();
  const [code, setCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [me, setMe] = useState<Seat | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openRooms, setOpenRooms] = useState<{ code: string; players: number; names: string[]; passwordRequired?: boolean }[]>([]);
  const [busyBots, setBusyBots] = useState(false);
  const created = useRef(0);
  const botsAdded = useRef(false);
  const polling = useRef(false);
  const listing = useRef(false);
  const posting = useRef(false);
  const currentCode = useRef<string | null>(null);
  const latestRoom = useRef<Room | null>(null);
  const acceptSnapshot = useCallback((data: {room?:Room;seats?:Seat[];me?:Seat|null}) => {
    if (!data.room || data.room.code !== currentCode.current) return;
    if (latestRoom.current && data.room.version < latestRoom.current.version) return;
    latestRoom.current = data.room;
    setRoom(data.room);
    if (data.seats) {
      setSeats(data.seats);
      setMe(previous => data.me ?? (previous ? {...previous, ...data.seats!.find(seat => seat.id === previous.id)} : null));
    } else if (data.me) setMe(data.me);
  }, []);


  const mySeatIndex = me?.seat ?? -1;
  const myTurn = room?.status === "playing" && room.turn === mySeatIndex;

  /* ---------- room list ---------- */
  const listRooms = useCallback(async (signal?: AbortSignal) => {
    if (listing.current) return;
    listing.current = true;
    try {
      const r = await fetch(`/api/rooms?game=${game}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
      const d = await r.json();
      if (!signal?.aborted) setOpenRooms(d.rooms ?? []);
    } catch { /* offline */ }
    finally { listing.current = false; }
  }, [game]);

  useEffect(() => {
    if (code) return;
    const controller = new AbortController();
    void listRooms(controller.signal);
    const t = setInterval(() => { void listRooms(controller.signal); }, 5000);
    return () => { clearInterval(t); controller.abort(); };
  }, [code, listRooms]);

  /* ---------- polling ---------- */
  const poll = useCallback(async (signal?: AbortSignal) => {
    if (!code || polling.current) return;
    polling.current = true;
    const saved = token ?? storage.getItem(tokKey(code));
    try {
      const r = await fetch(`/api/rooms/${code}?token=${saved ?? ""}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
      if (signal?.aborted) return;
      if (r.status === 404) { setErr("room closed by host or all players left"); setRoom(null); setSeats([]); setMe(null); return; }
      if (!r.ok) { setErr("room service unavailable"); return; }
      const d = await r.json();
      if (signal?.aborted) return;
      if (currentCode.current===code && saved && d.me===null) {
        storage.removeItem(tokKey(code));currentCode.current=null;latestRoom.current=null;
        setCode(null);setToken(null);setRoom(null);setSeats([]);setMe(null);
        setErr("your seat was removed; you may join again with the room password");
        window.history.replaceState(null,"",window.location.pathname);return;
      }
      acceptSnapshot(d);
    } catch { /* transient network error: keep last state */ }
    finally { polling.current = false; }
  }, [code, token, acceptSnapshot]);

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    void poll(controller.signal);
    const t = setInterval(() => { void poll(controller.signal); }, game === "memory" ? 500 : 1000);
    return () => { clearInterval(t); controller.abort(); };
  }, [code, poll, game]);

  function enter(c: string, t: string) {
    currentCode.current = c;
    latestRoom.current = null;
    storage.setItem(tokKey(c), t);
    setCode(c);
    setToken(t);
    setErr(null);
    botsAdded.current = false;
    window.history.replaceState(null, "", `?room=${c}`);
  }

  /* ---------- actions ---------- */
  const post = useCallback(async (body: Record<string, unknown>) => {
    if (!code || posting.current) return null;
    posting.current = true;
    setBusy(true);
    try {
      const r = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, expectVersion: latestRoom.current?.version, ...body }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 && ["leave", "close"].includes(String(body.action))) return {ok:true};
      acceptSnapshot(d);
      if (!r.ok) setErr(d.error ?? "error");
      else setErr(null);
      return d;
    } catch {
      setErr("network unavailable; try again");
      return null;
    } finally {
      posting.current = false;
      setBusy(false);
    }
  }, [code, token, acceptSnapshot]);

  const create = useCallback(async (seatsWanted = maxPlayers, passwordEnabled = false, password = "") => {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    setErr(null);
    try {
    const r = await fetch("/api/rooms", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, name, maxPlayers: seatsWanted, passwordEnabled, password }),
    });
    const d = await r.json();
    if (!r.ok) return setErr(d.error ?? "could not create room");
    created.current = Date.now();
    enter(d.room.code, d.me.token);
    } catch { setErr("could not create room; check connection"); }
    finally { posting.current = false; setBusy(false); }
  }, [game, name, maxPlayers]);

  const join = useCallback(async (c: string, password = "") => {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    setErr(null);
    try {
    const up = c.trim().toUpperCase();
    if (up.length !== 5) return setErr("room code is 5 characters");
    const saved = storage.getItem(tokKey(up));
    const r = await fetch(`/api/rooms/${up}`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", name, token: saved ?? "", password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "could not join");
    enter(up, d.me.token);
    } catch { setErr("could not join; check connection"); }
    finally { posting.current = false; setBusy(false); }
  }, [name]);

  const exit = useCallback(async (action: "leave" | "close") => {
    if (code) {
      const result = await post({ action });
      // Do not throw away a guest capability when a network request fails.
      if (!result?.ok) {
        if (err?.startsWith("room closed")) { /* acknowledged server closure */ }
        else return false;
      }
      storage.removeItem(tokKey(code));
    }
    currentCode.current = null; latestRoom.current = null;
    setCode(null); setToken(null); setRoom(null); setSeats([]); setMe(null);
    window.history.replaceState(null, "", window.location.pathname);
    return true;
  }, [code, post, err]);
  const leave = useCallback(() => exit("leave"), [exit]);
  const closeRoom = useCallback(() => exit("close"), [exit]);

  const addBots = useCallback(async (count = 1) => {
    setBusyBots(true);
    const d = await post({ action: "bots", count });
    setBusyBots(false);
    return d;
  }, [post]);

  const start = useCallback(async (state: Record<string, unknown>, turn = 0) => {
    const d = await post({ action: "start", state, turn });
    return d;
  }, [post]);

  const move = useCallback(async (payload: Record<string, unknown>) => {
    const d = await post({ action: "move", ...payload });
    return d;
  }, [post]);

  const rematch = useCallback(async (state: Record<string, unknown>, turn = 0) => {
    const d = await post({ action: latestRoom.current?.status === "finished" ? "rematch" : "restart", state, turn });
    return d;
  }, [post]);

  /* ---------- auto CPU fill: nobody joined -> a "random user" appears ---------- */
  useEffect(() => {
    if (!["tictactoe", "connect4"].includes(game) || !room || room.status !== "waiting" || mySeatIndex !== room.hostSeat) return;
    const humans = seats.filter((s) => !s.isCpu).length;
    if (humans >= 2 || botsAdded.current) return;
    const waited = Date.now() - created.current;
    if (created.current && waited < 9000) return; // give real players 9s first
    botsAdded.current = true;
    addBots(1);
  }, [game, room, seats, mySeatIndex, addBots]);

  // Offline is a presence hint, not an implicit leave or CPU conversion.
  const takeover = useCallback(async () => {
    setErr("offline seats stay reserved until their owner explicitly leaves");
  }, []);

  /* ---------- resume from ?room=CODE ---------- */
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("room");
    if (c) {
      const saved = storage.getItem(tokKey(c.toUpperCase()));
      if (saved) enter(c.toUpperCase(), saved);
    }
  }, []);

  return {
    game, maxPlayers, name, code, token, room, seats, me, err, busy, busyBots,
    mySeatIndex, myTurn, openRooms,
    create, join, leave, closeRoom, addBots, start, move, rematch, poll, takeover, listRooms,
    setErr,
  };
}

export type RoomApi = ReturnType<typeof useRoom>;

/** Lobby UI shared by every multiplayer game. */
export function RoomLobby({
  m,
  title,
  onPlay,
  onLeave,
  seatChooser,
  rules,
}: {
  m: RoomApi;
  title: string;
  onPlay?: () => void; // host press "start"
  onLeave?: () => void;
  seatChooser?: (n: number) => void; // let the host pick 2..10 seats
  rules?: string;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [max, setMax] = useState(m.maxPlayers);
  const [passwordEnabled,setPasswordEnabled]=useState(false),[password,setPassword]=useState(""),[joinPassword,setJoinPassword]=useState("");

  if (!m.code) {
    return (
      <>
      <details className="box">
        <summary className="cursor-pointer select-none font-bold">
          $ {title} - play with friends <span className="dim text-xs font-normal">(online room / random player / cpu - click to expand)</span>
        </summary>
        {rules && <p className="dim mt-1 text-sm">{rules}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="dim text-sm">create a room</p>
            {seatChooser && (
              <p className="mt-1 text-sm">
                seats:{" "}
                <input
                  className="inp w-16 text-center"
                  type="number"
                  min={2}
                  max={10}
                  value={max}
                  onChange={(e) => {
                    const v = Math.max(2, Math.min(10, Number(e.target.value) || 2));
                    setMax(v);
                    seatChooser(v);
                  }}
                />
                <span className="dim"> (2-10)</span>
              </p>
            )}
            <PasswordOption enabled={passwordEnabled} setEnabled={setPasswordEnabled} password={password} setPassword={setPassword}/>
            <button className="btn mt-2" disabled={m.busy||(passwordEnabled&&password.length<4)} onClick={() => m.create(max,passwordEnabled,password)}>create room</button>
            <p className="dim mt-1 text-xs">
              CPU fill is available for XoX and Connect Four; races and memory need real players.
            </p>
          </div>
          <div>
            <p className="dim text-sm">join with a code</p>
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); m.join(joinCode,joinPassword); }}>
              <input
                className="inp w-28 uppercase tracking-widest"
                value={joinCode}
                maxLength={5}
                placeholder="ABCDE"
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <input className="inp w-36" aria-label="join password" type="password" maxLength={128} placeholder="password (if set)" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)}/>
              <button className="btn" disabled={m.busy}>join</button>
            </form>
          </div>
        </div>
        {m.openRooms.length > 0 && (
          <div className="mt-4">
            <p className="dim text-sm">open rooms:</p>
            {m.openRooms.slice(0, 6).map((r) => (
              <p key={r.code}>
                <b>{r.code}</b> {r.passwordRequired && "[password]"} <span className="dim">{r.players}/{m.maxPlayers} - {r.names.join(", ")}</span>{" "}
                <button className="btn" style={{ padding: "0 6px" }} onClick={() => m.join(r.code,joinPassword)}>join</button>
              </p>
            ))}
          </div>
        )}
      </details>
      {m.err && <p className="mt-2">! {m.err}</p>}
      </>
    );
  }

  if (!m.room || !m.me) {
    return (
      <div className="box">
        <p>connecting to {m.code}... <span className="blink">_</span></p>
        {m.err && <p>! {m.err} <button className="btn ml-2" onClick={onLeave ?? m.leave}>back</button></p>}
      </div>
    );
  }

  const isHost = m.mySeatIndex === m.room.hostSeat;
  const humans = m.seats.filter((s) => !s.isCpu).length;

  if (m.room.status === "waiting") {
    return (
      <div className="box">
        <p className="dim text-sm">room code - share it:</p>
        <p className="text-4xl font-bold tracking-[0.4em]">{m.room.code}</p>
        <p className="dim text-xs">link: ?room={m.room.code}</p>
        <p className="mt-3 dim text-sm">seats ({m.seats.length}/{m.room.maxPlayers}):</p>
        {m.seats.map((s) => (
          <p key={s.id}>
            [{s.seat + 1}] {s.name}{" "}
            {s.id === m.me!.id && <b>(you)</b>}{" "}
            {s.left && <span className="dim">(left) </span>}
            {s.isCpu ? <span className="dim">cpu</span> : s.online ? "" : <span className="dim">(offline)</span>}
          </p>
        ))}
        <div className="mt-3 flex flex-wrap gap-2">
          {isHost && <button className="btn" disabled={m.seats.length < 2 || m.busy} onClick={onPlay}>start game</button>}
          {isHost && ["tictactoe", "connect4"].includes(m.game) && m.seats.length < m.room.maxPlayers && (
            <button className="btn" disabled={m.busyBots} onClick={() => m.addBots(1)}>+ add player</button>
          )}
          <button className="btn" disabled={m.busy} onClick={onLeave ?? m.leave}>leave</button>
          {isHost && <button className="btn" disabled={m.busy} onClick={() => { if (window.confirm("close this room for every player?")) void m.closeRoom(); }}>close room</button>}
        </div>
        {isHost && <HostRoomControls key={`${m.room.code}:${m.room.passwordRequired}`} protectedRoom={m.room.passwordRequired} busy={m.busy} players={m.seats.filter(s=>s.id!==m.me?.id&&!s.isCpu&&!s.left)} onCommand={m.move}/>}
        {!isHost && <p className="dim mt-2 text-sm">waiting for host to start<span className="blink">...</span></p>}
        {m.err && <p className="mt-2">! {m.err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>room=<b>{m.room.code}</b></span>
      <span className="dim">
        {m.seats.map((s, i) => (
          <span key={s.id} className={i === m.room!.turn ? "inv px-1" : s.online || s.isCpu ? "" : "dim"}>
            {i > 0 && " · "}{s.name}{s.isCpu ? "*" : ""}
          </span>
        ))}
      </span>
      <span className={m.myTurn ? "inv px-2" : "dim"}>
        {m.room.status === "finished" ? "finished" : m.myTurn ? ">> your turn <<" : `waiting: ${m.seats[m.room.turn]?.name ?? "?"}`}
      </span>
      <button className="btn" style={{ padding: "0 6px" }} onClick={onLeave ?? m.leave}>leave</button>
      {isHost && <button className="btn" disabled={m.busy} onClick={() => { if (window.confirm("close this room for every player?")) void m.closeRoom(); }}>close room</button>}
      {isHost && <HostRoomControls key={`${m.room.code}:${m.room.passwordRequired}`} protectedRoom={m.room.passwordRequired} busy={m.busy} players={m.seats.filter(s=>s.id!==m.me?.id&&!s.isCpu&&!s.left)} onCommand={m.move}/>}
      {m.err && <span role="status">! {m.err}</span>}
      <span className="dim">* = cpu &nbsp; {humans} human{humans === 1 ? "" : "s"}</span>
    </div>
  );
}
