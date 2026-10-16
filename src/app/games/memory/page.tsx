"use client";
import { useEffect, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, shuffle, useBest, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
import { flipMemory, settleMemory, type MemoryState } from "@/lib/memory-rules";
import { usePlayerName } from "@/lib/player";

const SYMBOLS = "@#$%&*+=?!<>{}[]~^/\\|ABCDEFGHJKLMNPQRSTUVWXYZ0123456789".split("");

/* ---------------- solo (endless levels) ---------------- */

type Card = { id: number; sym: string; open: boolean; done: boolean };

function makeLevel(level: number): Card[] {
  const pairs = Math.min(2 + level, 18);
  const deck = freshPattern("memory", () => {
    const syms = shuffle(SYMBOLS).slice(0, pairs);
    return shuffle([...syms, ...syms]);
  }, (d) => d.join(""));
  return deck.map((sym, id) => ({ id, sym, open: false, done: false }));
}

/* ---------------- versus (2-10 players, shared board) ---------------- */

type V = MemoryState;

function makeV(players: number, seedKey = "memory-vs"): V {
  const pairsCount = Math.max(6, Math.min(18, 4 + Math.round(players * 1.4)));
  const syms = freshPattern(seedKey, () => {
    const s = shuffle(SYMBOLS).slice(0, pairsCount);
    return shuffle([...s, ...s]);
  }, (d) => d.join(""));
  return { syms, open: [], matched: [], pairs: Array(players).fill(0), turn: 0, log: [], done: false, resolveAt: null };
}

type Mode = "menu" | "solo" | "local" | "online";

export default function Memory() {
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");

  // solo
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [openS, setOpenS] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [phase, setPhase] = useState<"idle" | "play" | "clear">("idle");
  const [best, report] = useBest("memory");

  // local versus
  const [v, setV] = useState<V | null>(null);
  const [players, setPlayers] = useState(2);

  // online versus
  const m = useRoom("memory", 10);
  useEffect(() => { if (m.code) setMode("online"); }, [m.code]);
  const OV = (m.room?.state as unknown as V | undefined) ?? null;

  /* solo logic */
  function startSolo(l: number) {
    setCards(makeLevel(l));
    setOpenS([]);
    setMoves(0);
    setPhase("play");
  }
  useEffect(() => {
    if (mode !== "solo" || openS.length !== 2) return;
    const [a, b] = openS;
    const match = cards[a]?.sym === cards[b]?.sym;
    const t = setTimeout(() => {
      setCards((cs) => cs.map((c) => (c.id === a || c.id === b ? { ...c, open: match, done: match } : c)));
      setOpenS([]);
    }, match ? 250 : 700);
    return () => clearTimeout(t);
  }, [openS, cards, mode]);
  useEffect(() => {
    if (mode !== "solo" || phase !== "play" || !cards.length || !cards.every((c) => c.done)) return;
    setPhase("clear");
    setCleared((c) => c + 1);
    report(level);
    submitScore("memory", level, { moves }, name);
  }, [cards, phase, mode, level, moves, report, name]);

  function flipSolo(i: number) {
    if (phase !== "play" || openS.length >= 2 || cards[i].open || cards[i].done) return;
    setCards((cs) => cs.map((c) => (c.id === i ? { ...c, open: true } : c)));
    if (openS.length === 1) setMoves((mv) => mv + 1);
    setOpenS((o) => [...o, i]);
  }

  /* versus logic */
  function localFlip(i: number) {
    if (!v || v.done) return;
    setV((cur) => (cur ? flipMemory(cur, i, `p${cur.turn + 1}`, Date.now()) : cur));
  }
  function onlineFlip(i: number) {
    if (!OV || OV.done || !m.myTurn || m.busy || OV.open.length >= 2) return;
    void m.move({ action: "memory-flip", index: i });
  }
  useEffect(() => {
    if (mode !== "local" || !v?.resolveAt || v.done) return;
    const timer = setTimeout(() => setV(previous => previous ? settleMemory(previous, Date.now()) : previous), Math.max(0, v.resolveAt - Date.now()) + 10);
    return () => clearTimeout(timer);
  }, [mode, v?.resolveAt, v?.done]);

  if (mode === "menu") {
    return (
      <Shell path="/games/memory" title="memory pairs" help="flip two cards per turn; matching symbols score. solo levels, same device, or an online room.">
        <div className="box flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("solo"); setLevel(1); startSolo(1); }}>solo - endless levels</button>
          <button className="btn" onClick={() => { setMode("local"); setV(makeV(players)); }}>same device (2-10 players)</button>
          <button className="btn" onClick={() => setMode("online")}>online room (2-10)</button>
        </div>
        <p className="mt-3 text-sm">
          same-device players:{" "}
          <input className="inp w-16 text-center" type="number" min={2} max={10} value={players}
            onChange={(e) => setPlayers(Math.max(2, Math.min(10, Math.floor(Number(e.target.value)) || 2)))} />
        </p>
        <details className="dim mt-2 text-sm"><summary className="cursor-pointer">versus rules</summary><p>
          versus rules: on your turn you flip one card, then a second. A match scores a point and you go again;
          no match passes the turn. Most pairs when the board is empty wins.
        </p></details>
      </Shell>
    );
  }

  if (mode === "online" && (!m.room || m.room.status === "waiting" || !m.me)) {
    return (
      <Shell path="/games/memory" title="memory pairs - online">
        <RoomLobby
          m={m}
          title="memory room"
          seatChooser={() => {}}
          rules="2-10 players share one board and take turns flipping two cards."
          onPlay={() => m.start(makeV(m.seats.length) as unknown as Record<string, unknown>, 0)}
          onLeave={async () => { if (await m.leave()) setMode("menu"); }}
        />
      </Shell>
    );
  }

  if (mode === "solo") {
    const cols = Math.ceil(Math.sqrt(cards.length || 4));
    return (
      <Shell path="/games/memory" title="memory pairs - solo" help="each level adds a pair and reshuffles everything. a fresh pattern every level.">
        <Stats items={[["level", level], ["pairs", cards.length / 2 || "-"], ["moves", moves], ["cleared", cleared], ["best", best]]} />
        <div className="mt-4 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 54px)` }}>
          {cards.map((c) => (
            <button key={`${level}-${c.id}`} className={`cell text-xl ${c.done ? "soft" : c.open ? "on" : ""}`}
              style={{ width: 54, height: 54 }} onClick={() => flipSolo(c.id)}>
              {c.open || c.done ? c.sym : "?"}
            </button>
          ))}
        </div>
        {phase === "clear" && (
          <Banner title={`level ${level} clear`} lines={[`${moves} moves. next level: ${Math.min(3 + level, 18)} pairs, new symbols, new shuffle.`]}
            action="next level" onAction={() => { const n = level + 1; setLevel(n); startSolo(n); }} />
        )}
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={() => startSolo(level)}>reshuffle level</button>
          <button className="btn" onClick={() => { setMode("menu"); setPhase("idle"); setCards([]); }}>mode menu</button>
        </div>
      </Shell>
    );
  }

  // versus (local or online)
  const V = mode === "online" ? OV : v;
  if (!V) return <Shell path="/games/memory" title="memory pairs">loading...</Shell>;
  const cols = Math.ceil(Math.sqrt(V.syms.length));
  const names = mode === "online" ? m.seats.map((s) => s.name) : V.pairs.map((_, i) => `p${i + 1}`);

  return (
    <Shell path="/games/memory" title="memory pairs - versus" help="match a pair to score and go again; otherwise the turn passes." wide>
      {mode === "online" && <RoomLobby m={m} title="memory room" onPlay={() => m.start(makeV(m.seats.length) as unknown as Record<string, unknown>, 0)} onLeave={async () => { if (await m.leave()) setMode("menu"); }} />}
      <Stats items={[["players", V.pairs.length], ["pairs left", (V.syms.length - V.matched.length) / 2], ["turn", `${names[V.turn] ?? "?"}`], ["matched", V.matched.length / 2]]} />
      <p className="mt-2 text-sm">{V.pairs.map((p, i) => `[${i + 1}] ${names[i] ?? "?"}: ${p}`).join("  ")}</p>

      <div className="mt-3 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 50px)` }}>
        {V.syms.map((s, i) => {
          const shown = V.matched.includes(i) || V.open.includes(i);
          return (
            <button key={i} className={`cell text-lg ${V.matched.includes(i) ? "soft" : shown ? "on" : ""}`}
              style={{ width: 50, height: 50, borderStyle: V.matched.includes(i) ? "dashed" : "solid" }}
              onClick={() => (mode === "online" ? onlineFlip(i) : localFlip(i))}
              disabled={V.done || V.open.length >= 2 || V.open.includes(i) || V.matched.includes(i) || (mode === "online" && (!m.myTurn || m.busy))}>
              {shown ? s : "?"}
            </button>
          );
        })}
      </div>

      {V.log.length > 0 && (
        <div className="box-dashed mt-3 text-xs">
          {V.log.map((l, i) => <p key={i}>&gt; {l}</p>)}
        </div>
      )}

      {V.done && (
        <Banner
          title={`board clear - ${names.filter((_, index) => V.pairs[index] === Math.max(...V.pairs)).join(" & ")} ${V.pairs.filter(n => n === Math.max(...V.pairs)).length > 1 ? "tie" : "wins"} with ${Math.max(...V.pairs)} pairs`}
          lines={[V.pairs.map((p, i) => `${names[i]}: ${p}`).join("  ")]}
          action={mode === "online" && m.mySeatIndex !== m.room?.hostSeat ? undefined : "rematch (new board)"}
          onAction={() => (mode === "online"
            ? m.rematch(makeV(m.seats.length, "memory-vs") as unknown as Record<string, unknown>, 0)
            : setV(makeV(players)))}
        />
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={mode === "online" && (m.busy || m.mySeatIndex !== m.room?.hostSeat)} onClick={() => (mode === "online" ? m.rematch(makeV(m.seats.length) as unknown as Record<string, unknown>, 0) : setV(makeV(players)))}>new board</button>
        <button className="btn" onClick={async () => { if (mode !== "online" || await m.leave()) setMode("menu"); }}>mode menu</button>
      </div>
    </Shell>
  );
}
