"use client";
import { useEffect, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, shuffle, useBest, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
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

type V = {
  syms: string[];
  open: number[];
  matched: number[];
  pairs: number[];
  turn: number;
  log: string[];
  done: boolean;
};

function makeV(players: number, seedKey = "memory-vs"): V {
  const pairsCount = Math.max(6, Math.min(18, 4 + Math.round(players * 1.4)));
  const syms = freshPattern(seedKey, () => {
    const s = shuffle(SYMBOLS).slice(0, pairsCount);
    return shuffle([...s, ...s]);
  }, (d) => d.join(""));
  return { syms, open: [], matched: [], pairs: Array(players).fill(0), turn: 0, log: [], done: false };
}

function flipV(v: V, i: number, who: string): V {
  if (v.done || v.open.includes(i) || v.matched.includes(i)) return v;
  const open = [...v.open, i];
  const log = (l: string[]) => [`${who}: ${l}`, ...l].slice(0, 6);
  if (open.length < 2) return { ...v, open, log: log(v.log) };
  const [a, b] = open;
  if (v.syms[a] === v.syms[b]) {
    const matched = [...v.matched, a, b];
    const pairs = [...v.pairs];
    pairs[v.turn] += 1;
    const done = matched.length === v.syms.length;
    return { ...v, open: [], matched, pairs, done, log: log(v.log).map((x, idx) => (idx === 0 ? `${who}: ${v.syms[a]}${v.syms[b]} MATCH (+1, goes again)` : x)) };
  }
  const next = (v.turn + 1) % v.pairs.length;
  return { ...v, open: [], turn: next, log: log(v.log).map((x, idx) => (idx === 0 ? `${who}: ${v.syms[a]}${v.syms[b]} no match -> next player` : x)) };
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
    setV((cur) => (cur ? flipV(cur, i, `p${cur.turn + 1}`) : cur));
  }
  function onlineFlip(i: number) {
    if (!OV || OV.done || !m.myTurn) return;
    const next = flipV(OV, i, m.me?.name ?? "you");
    if (next === OV) return;
    m.move({
      state: next as unknown as Record<string, unknown>,
      expectTurn: m.mySeatIndex,
      turn: next.turn,
      score: next.pairs[m.mySeatIndex],
      status: next.done ? "finished" : "playing",
    });
    if (next.done) submitScore("memory", 1, { mode: "versus-online", pairs: next.pairs[m.mySeatIndex] }, name);
  }

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
            onChange={(e) => setPlayers(Math.max(2, Math.min(10, Number(e.target.value) || 2)))} />
        </p>
        <p className="dim mt-2 text-sm">
          versus rules: on your turn you flip one card, then a second. A match scores a point and you go again;
          no match passes the turn. Most pairs when the board is empty wins.
        </p>
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
          onLeave={() => { m.leave(); setMode("menu"); }}
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
      {mode === "online" && <RoomLobby m={m} title="memory room" onPlay={() => m.start(makeV(m.seats.length) as unknown as Record<string, unknown>, 0)} onLeave={() => { m.leave(); setMode("menu"); }} />}
      <Stats items={[["players", V.pairs.length], ["pairs left", (V.syms.length - V.matched.length) / 2], ["turn", `${names[V.turn] ?? "?"}`], ["matched", V.matched.length / 2]]} />
      <p className="mt-2 text-sm">{V.pairs.map((p, i) => `[${i + 1}] ${names[i] ?? "?"}: ${p}`).join("  ")}</p>

      <div className="mt-3 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 50px)` }}>
        {V.syms.map((s, i) => {
          const shown = V.matched.includes(i) || V.open.includes(i);
          return (
            <button key={i} className={`cell text-lg ${V.matched.includes(i) ? "soft" : shown ? "on" : ""}`}
              style={{ width: 50, height: 50, borderStyle: V.matched.includes(i) ? "dashed" : "solid" }}
              onClick={() => (mode === "online" ? onlineFlip(i) : localFlip(i))}
              disabled={V.done || (mode === "online" && !m.myTurn)}>
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
          title={`board clear - ${names[V.pairs.indexOf(Math.max(...V.pairs))]} wins with ${Math.max(...V.pairs)} pairs`}
          lines={[V.pairs.map((p, i) => `${names[i]}: ${p}`).join("  ")]}
          action="rematch (new board)"
          onAction={() => (mode === "online"
            ? m.rematch(makeV(m.seats.length, "memory-vs") as unknown as Record<string, unknown>, 0)
            : setV(makeV(players)))}
        />
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn" onClick={() => (mode === "online" ? m.rematch(makeV(m.seats.length) as unknown as Record<string, unknown>, 0) : setV(makeV(players)))}>new board</button>
        <button className="btn" onClick={() => { if (mode === "online") m.leave(); setMode("menu"); }}>mode menu</button>
      </div>
    </Shell>
  );
}
