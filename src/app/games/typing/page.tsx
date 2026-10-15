"use client";
import { useEffect, useRef, useState } from "react";
import { useClock } from "@/lib/clock";
import { Shell, Stats, Banner } from "@/components/term";
import { freshPattern, pick, randInt, shuffle, useBest, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
import { usePlayerName } from "@/lib/player";
import { ALL_WORDS } from "@/lib/words";

const TARGET = 8; // race: first to win this many lines

function makeLine(level: number) {
  const count = Math.min(3 + level, 14);
  const maxLen = Math.min(4 + level, 9);
  const pool = ALL_WORDS.filter((w) => w.length <= maxLen);
  return freshPattern("typing", () => {
    const words = shuffle(pool).slice(0, count).map((w) => (level >= 6 && randInt(10) < 3 ? w.toUpperCase() : w));
    return words.join(" ") + (level >= 4 ? pick([".", "!", "?", ";"]) : "");
  }, (s) => s);
}
const timeFor = (line: string, level: number) => Math.ceil(line.length * Math.max(0.22, 0.55 - level * 0.03) * 10);

type R = { turn?:number; line: string; lid: number; level: number; endsAt: number; scores: number[]; log: string[] };
function newRace(players: number, level = 1, scores?: number[], turn = 0): R {
  const line = makeLine(level);
  return { turn, line, lid: randInt(1e9), level, endsAt: Date.now() + timeFor(line, level) * 100, scores: scores ?? Array(players).fill(0), log: [] };
}

type Mode = "menu" | "solo" | "local" | "online";

export default function TypeRush() {
  const now = useClock();
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");

  /* solo */
  const [level, setLevel] = useState(1);
  const [line, setLine] = useState("");
  const [typed, setTyped] = useState("");
  const [time, setTime] = useState(0);
  const [limit, setLimit] = useState(0);
  const [phase, setPhase] = useState<"idle" | "play" | "clear" | "over">("idle");
  const [best, report] = useBest("typing");
  const inp = useRef<HTMLInputElement>(null);
  const started = useRef(0);

  function begin(l: number) {
    const s = makeLine(l);
    const lim = timeFor(s, l);
    setLine(s); setTyped(""); setLimit(lim); setTime(lim); setPhase("play");
    started.current = Date.now();
    setTimeout(() => inp.current?.focus(), 30);
  }
  useEffect(() => {
    if (mode !== "solo" || phase !== "play") return;
    const t = setInterval(() => setTime((x) => x - 1), 100);
    return () => clearInterval(t);
  }, [phase, mode]);
  useEffect(() => {
    if (mode === "solo" && phase === "play" && time <= 0) {
      setPhase("over"); report(level - 1); submitScore("typing", level - 1, {}, name);
    }
  }, [time, phase, mode, level, report, name]);
  function onSoloType(v: string) {
    if (phase !== "play" || !line.startsWith(v)) return;
    setTyped(v);
    if (v === line) { setPhase("clear"); report(level); }
  }

  /* race */
  const [players, setPlayers] = useState(2);
  const [r, setR] = useState<R | null>(null);
  const [rtyped, setRtyped] = useState("");
  const m = useRoom("typing", 10);
  useEffect(() => { if (m.code) setMode("online"); }, [m.code]);
  const OR = (m.room?.state as unknown as R | undefined) ?? null;
  const RACE = mode === "online" ? OR : r;
  useEffect(() => { setRtyped(""); }, [RACE?.lid, mode]);

  function onRaceType(v: string) {
    if (!RACE || !RACE.line.startsWith(v) || Date.now() >= RACE.endsAt || m.room?.status === "finished" || (mode === "online" && m.busy)) return;
    setRtyped(v);
    if (v !== RACE.line) return;
    if (mode === "online") {
      void m.move({action:"race-answer",challenge:RACE.lid,answer:v});
      return;
    }
    const idx = RACE.turn ?? 0;
    const scores = [...RACE.scores];
    scores[idx] = (scores[idx] ?? 0) + 1;
    const win = scores[idx] >= TARGET;
    const who = `p${idx + 1}`;
    const next = newRace(scores.length, RACE.level + 1, scores, (idx + 1) % scores.length);
    next.log = [`${who}: typed the line (${scores[idx]}/${TARGET})${win ? " - WINS" : ""}`, ...RACE.log].slice(0, 6);
    setRtyped("");
    setR(win ? { ...next, endsAt: 0 } : next);
    if (win) submitScore("typing", scores[idx], { mode: "race-local" }, name);
  }

  useEffect(() => {
    if (mode === "solo" || mode === "menu" || !RACE || !Array.isArray(RACE.scores) || (mode === "online" && m.room?.status !== "playing") || (mode === "local" && RACE.endsAt === 0)) return;
    const t = setInterval(() => {
      const live = mode === "online" ? OR : r;
      if (!live || Date.now() < live.endsAt) return;
      const next = newRace(live.scores.length, live.level, live.scores, ((live.turn ?? 0) + 1) % live.scores.length);
      next.log = [`nobody finished "${live.line.slice(0, 18)}..."`, ...live.log].slice(0, 6);
      if (mode === "online") void m.move({action:"race-timeout",challenge:live.lid});
      else setR(next);
      setRtyped("");
    }, 400);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, OR, r, m.room?.status]);

  if (mode === "menu") {
    return (
      <Shell path="/games/typing" title="type rush" help="type the line exactly, before the clock runs out. wrong keys are rejected so you must fix them.">
        <div className="box flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("solo"); begin(1); }}>solo - endless levels</button>
          <button className="btn" onClick={() => { setMode("local"); setR(newRace(players)); }}>same device (turn relay)</button>
          <button className="btn" onClick={() => setMode("online")}>online race (2-10)</button>
        </div>
        <p className="mt-3 text-sm">players (same device shares one keyboard):{" "}
          <input className="inp w-16 text-center" type="number" min={2} max={10} value={players}
            onChange={(e) => setPlayers(Math.max(2, Math.min(10, Math.floor(Number(e.target.value)) || 2)))} />
        </p>
        <p className="dim mt-2 text-sm">race: everybody types the same line; the first to finish it scores a point and a new line appears. first to {TARGET} wins.</p>
      </Shell>
    );
  }

  if (mode === "online" && (!m.room || m.room.status === "waiting" || !m.me)) {
    return (
      <Shell path="/games/typing" title="type rush - online">
        <RoomLobby m={m} title="typing race" seatChooser={() => {}} rules={`2-10 players, same line, first to ${TARGET} lines wins.`}
          onPlay={() => m.start(newRace(m.seats.length) as unknown as Record<string, unknown>, -1)}
          onLeave={async () => { if (await m.leave()) setMode("menu"); }} />
      </Shell>
    );
  }

  if (mode === "solo") {
    const bar = limit ? Math.round((Math.max(0, time) / limit) * 30) : 0;
    const secs = Math.max(0.1, (limit - time) / 10);
    return (
      <Shell path="/games/typing" title="type rush - solo" help="lines get longer, add capitals and punctuation, and the clock gets tighter.">
        <Stats items={[["level", level], ["time", `${(Math.max(0, time) / 10).toFixed(1)}s`], ["best", best]]} />
        {phase === "idle" ? <button className="btn mt-4" onClick={() => begin(1)}>start</button> : (
          <div className="box mt-4">
            <p className="text-sm">[{"#".repeat(bar)}{".".repeat(30 - bar)}]</p>
            <p className="mt-3 break-words text-xl">
              <span className="inv">{typed}</span>
              <span className="underline">{line[typed.length] ?? ""}</span>
              <span className="dim">{line.slice(typed.length + 1)}</span>
            </p>
            <input ref={inp} className="inp mt-3 w-full" value={typed} onChange={(e) => onSoloType(e.target.value)}
              disabled={phase !== "play"} autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="off" />
          </div>
        )}
        {phase === "clear" && <Banner title={`level ${level} clear`} lines={[`${Math.round((line.length / 5) / (secs / 60))} wpm`]} action="next level" onAction={() => { const n = level + 1; setLevel(n); begin(n); }} />}
        {phase === "over" && <Banner title="time up" lines={[`score: ${level - 1}`]} action="play again" onAction={() => { setLevel(1); begin(1); }} />}
        <div className="mt-3"><button className="btn" onClick={() => { setMode("menu"); setPhase("idle"); }}>mode menu</button></div>
      </Shell>
    );
  }

  if (!RACE) return <Shell path="/games/typing" title="type rush">loading...</Shell>;
  const leftMs = Math.max(0, RACE.endsAt - now);
  const names = mode === "online" ? m.seats.map((s) => s.name) : RACE.scores.map((_, i) => `p${i + 1}`);
  const leader = RACE.scores.indexOf(Math.max(...RACE.scores));
  const finished = m.room?.status === "finished" || (mode === "local" && RACE.endsAt === 0);

  return (
    <Shell path="/games/typing" title="type rush - race" help={`first to ${TARGET} lines wins.${mode === "local" ? ` p${(RACE.turn ?? 0) + 1} types next.` : ""}`} wide>
      {mode === "online" && <RoomLobby m={m} title="typing race" onPlay={() => m.start(newRace(m.seats.length) as unknown as Record<string, unknown>, -1)} onLeave={async () => { if (await m.leave()) setMode("menu"); }} />}
      <Stats items={[["level", RACE.level], ["target", TARGET], ["time left", `${(leftMs / 1000).toFixed(1)}s`]]} />
      <p className="mt-2 text-sm">{RACE.scores.map((p, i) => <span key={i} className={i === leader ? "inv px-1" : ""}>{i > 0 && "  "}{names[i] ?? i + 1}: {p}</span>)}</p>
      {!finished && (
        <div className="box mt-4">
          <p className="break-words text-xl">
            <span className="inv">{rtyped}</span>
            <span className="underline">{RACE.line[rtyped.length] ?? ""}</span>
            <span className="dim">{RACE.line.slice(rtyped.length + 1)}</span>
          </p>
          <input ref={inp} className="inp mt-3 w-full" value={rtyped} onChange={(e) => onRaceType(e.target.value)}
            autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="off" />
        </div>
      )}
      {RACE.log.length > 0 && <div className="box-dashed mt-3 text-xs">{RACE.log.map((l, i) => <p key={i}>&gt; {l}</p>)}</div>}
      {finished && (
        <Banner title={`${names[leader]} wins ${Math.max(...RACE.scores)}-${TARGET}`} action={mode === "online" && m.mySeatIndex !== m.room?.hostSeat ? undefined : "rematch"}
          onAction={() => (mode === "online" ? m.rematch(newRace(m.seats.length) as unknown as Record<string, unknown>, -1) : setR(newRace(players)))} />
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={mode === "online" && (m.busy || m.mySeatIndex !== m.room?.hostSeat)} onClick={() => (mode === "online" ? m.rematch(newRace(m.seats.length) as unknown as Record<string, unknown>, -1) : setR(newRace(players)))}>restart race</button>
        <button className="btn" onClick={async () => { if (mode !== "online" || await m.leave()) setMode("menu"); }}>mode menu</button>
      </div>
    </Shell>
  );
}
