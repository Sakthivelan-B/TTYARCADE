"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClock } from "@/lib/clock";
import { Shell, Stats, Banner, lifeBar } from "@/components/term";
import { freshPattern, pick, randInt, useBest, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
import { usePlayerName } from "@/lib/player";

const PER_LEVEL = 5;
const MAX_LIVES = 3;
const TARGET = 30; // race: first to this many points wins

function makeQ(level: number): { q: string; a: number } {
  const max = 5 + level * 5;
  const ops = ["+"];
  if (level >= 2) ops.push("-");
  if (level >= 3) ops.push("x");
  if (level >= 5) ops.push("/");
  return freshPattern("math", () => {
    const op = pick(ops);
    let a = 1 + randInt(max), b = 1 + randInt(max);
    if (op === "x") { a = 2 + randInt(Math.min(4 + level, 20)); b = 2 + randInt(Math.min(4 + level, 15)); }
    if (op === "/") { b = 2 + randInt(Math.min(3 + level, 12)); a = b * (1 + randInt(Math.min(3 + level, 15))); }
    if (op === "-" && b > a) [a, b] = [b, a];
    let ans = op === "+" ? a + b : op === "-" ? a - b : op === "x" ? a * b : a / b;
    let q = `${a} ${op} ${b}`;
    if (level >= 7 && randInt(2)) {
      const c = 1 + randInt(10);
      const op2 = pick(["+", "-"]);
      ans = op2 === "+" ? ans + c : ans - c;
      q = `${q} ${op2} ${c}`;
    }
    return { q, a: ans };
  }, (x) => x.q);
}

const timeFor = (level: number) => Math.max(8, 26 - level * 1.5);

/* race state shared by local + online */
type R = { q: string; a: number; qid: number; level: number; endsAt: number; scores: number[]; turn: number; log: string[] };
function newRace(players: number, level = 1, scores?: number[], turn = 0): R {
  const { q, a } = makeQ(level);
  return {
    q, a, qid: randInt(1e9), level,
    endsAt: Date.now() + timeFor(level) * 1000,
    scores: scores ?? Array(players).fill(0),
    turn,
    log: [],
  };
}

type Mode = "menu" | "solo" | "local" | "online";

export default function MathSprint() {
  const now = useClock();
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");

  /* ---- solo ---- */
  const [level, setLevel] = useState(1);
  const [done, setDone] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [cur, setCur] = useState<{ q: string; a: number } | null>(null);
  const [ans, setAns] = useState("");
  const [time, setTime] = useState(0);
  const [over, setOver] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, report] = useBest("math");
  const inp = useRef<HTMLInputElement>(null);
  const limit = Math.max(12, 30 - level);

  function begin(l: number) {
    setLevel(l); setDone(0); setTime(Math.max(12, 30 - l) * 10); setCur(makeQ(l)); setAns("");
    setTimeout(() => inp.current?.focus(), 30);
  }
  function newSolo() { setLives(MAX_LIVES); setScore(0); setOver(null); begin(1); }
  useEffect(() => {
    if (mode !== "solo" || !cur || over) return;
    const t = setInterval(() => setTime((x) => x - 1), 100);
    return () => clearInterval(t);
  }, [cur, over, mode]);
  const endSolo = useCallback((why: string) => {
    setOver(why); report(score); submitScore("math", score, { level }, name);
  }, [report, score, level, name]);
  useEffect(() => {
    if (mode === "solo" && cur && !over && time <= 0) endSolo("time up");
  }, [time, cur, over, mode, endSolo]);

  function soloSubmit() {
    if (!cur || ans === "") return;
    if (Number(ans) === cur.a) {
      setScore((s) => s + level);
      if (done + 1 >= PER_LEVEL) begin(level + 1);
      else { setDone(done + 1); setCur(makeQ(level)); setAns(""); }
    } else {
      const left = lives - 1;
      setLives(left); setAns("");
      if (left <= 0) endSolo(`wrong: ${cur.q} = ${cur.a}`);
      else setCur(makeQ(level));
    }
  }

  /* ---- race (local + online) ---- */
  const [players, setPlayers] = useState(2);
  const [r, setR] = useState<R | null>(null);
  const [rans, setRans] = useState("");
  const [rmsg, setRmsg] = useState("");
  const m = useRoom("math", 10);
  useEffect(() => { if (m.code) setMode("online"); }, [m.code]);
  const OR = (m.room?.state as unknown as R | undefined) ?? null;
  const RACE = mode === "online" ? OR : r;
  useEffect(() => { setRans(""); }, [RACE?.qid, mode]);

  function raceAnswer() {
    if (!RACE || rans === "" || Date.now() >= RACE.endsAt || m.room?.status === "finished") return;
    if (mode === "online") {
      if (!m.busy) void m.move({action:"race-answer",challenge:RACE.qid,answer:rans});
      return;
    }
    const correct = Number(rans) === RACE.a;
    const who = `p${RACE.turn + 1}`;
    const seatIdx = RACE.turn;
    if (!correct) {
      setRmsg(`${who}: wrong`);
      setRans("");
      if (mode === "local") setR({ ...RACE, turn: (RACE.turn + 1) % RACE.scores.length, log: [`${who}: wrong -> next`, ...RACE.log].slice(0, 6) });
      return;
    }
    const scores = [...RACE.scores];
    scores[seatIdx] = (scores[seatIdx] ?? 0) + RACE.level;
    const win = scores[seatIdx] >= TARGET;
    const next = newRace(scores.length, RACE.level + (win ? 0 : 1), scores, (seatIdx + 1) % scores.length);
    next.log = [`${who}: ${RACE.q} = ${RACE.a} (+${RACE.level})${win ? " - WINS" : ""}`, ...RACE.log].slice(0, 6);
    setRans(""); setRmsg(`${who} scored`);
    setR(win ? { ...next, endsAt: 0 } : next);
    if (win) submitScore("math", scores[seatIdx], { mode: "race-local" }, name);
  }

  // race clock: expire the question and hand out a new one
  useEffect(() => {
    if (mode === "solo" || mode === "menu" || !RACE || !Array.isArray(RACE.scores) || (mode === "online" && m.room?.status !== "playing") || (mode === "local" && RACE.endsAt === 0)) return;
    const t = setInterval(() => {
      const live = mode === "online" ? OR : r;
      if (!live || Date.now() < live.endsAt) return;
      const next = newRace(live.scores.length, live.level, live.scores, mode === "online" ? live.turn : (live.turn + 1) % live.scores.length);
      next.log = [`timeout on "${live.q}" (answer ${live.a})`, ...live.log].slice(0, 6);
      if (mode === "online") void m.move({ action:"race-timeout", challenge:live.qid });
      else setR(next);
    }, 400);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, OR, r, m.room?.status]);

  if (mode === "menu") {
    return (
      <Shell path="/games/math" title="math sprint" help="mental maths against the clock. solo levels, same-device relay, or an online race for up to 10 players.">
        <div className="box flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("solo"); newSolo(); }}>solo - endless levels</button>
          <button className="btn" onClick={() => { setMode("local"); setR(newRace(players)); }}>same device (2-10 players)</button>
          <button className="btn" onClick={() => setMode("online")}>online race (2-10)</button>
        </div>
        <p className="mt-3 text-sm">same-device players:{" "}
          <input className="inp w-16 text-center" type="number" min={2} max={10} value={players}
            onChange={(e) => setPlayers(Math.max(2, Math.min(10, Math.floor(Number(e.target.value)) || 2)))} />
        </p>
        <p className="dim mt-2 text-sm">
          race rules: everyone sees the same question. a correct answer scores the current level value and a new
          question appears at once. first to {TARGET} points wins. operators unlock as the level rises: + - x / and 3-term chains.
        </p>
      </Shell>
    );
  }

  if (mode === "online" && (!m.room || m.room.status === "waiting" || !m.me)) {
    return (
      <Shell path="/games/math" title="math sprint - online">
        <RoomLobby m={m} title="math race" seatChooser={() => {}} rules={`2-10 players, same questions, first to ${TARGET} points.`}
          onPlay={() => m.start(newRace(m.seats.length) as unknown as Record<string, unknown>, -1)}
          onLeave={async () => { if (await m.leave()) setMode("menu"); }} />
      </Shell>
    );
  }

  if (mode === "solo") {
    const bar = Math.round((Math.max(0, time) / (limit * 10)) * 30);
    return (
      <Shell path="/games/math" title="math sprint - solo" help={`solve ${PER_LEVEL} problems per level before the clock runs out. 3 lives.`}>
        <Stats items={[["level", level], ["progress", `${done}/${PER_LEVEL}`], ["lives", lifeBar(lives, MAX_LIVES)], ["score", score], ["best", best]]} />
        {!cur ? <button className="btn mt-4" onClick={newSolo}>start</button>
          : over ? <Banner title="game over" lines={[over, `score ${score}, level ${level}`]} action="play again" onAction={newSolo} />
            : (
              <form className="box mt-4" onSubmit={(e) => { e.preventDefault(); soloSubmit(); }}>
                <p className="text-sm">[{"#".repeat(bar)}{".".repeat(30 - bar)}] {(Math.max(0, time) / 10).toFixed(1)}s</p>
                <p className="mt-3 text-4xl font-bold">{cur.q} = ?</p>
                <div className="mt-3 flex gap-2">
                  <input ref={inp} className="inp w-40 text-2xl" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value.replace(/[^\d-]/g, ""))} />
                  <button className="btn" disabled={m.busy}>enter</button>
                </div>
              </form>
            )}
        <div className="mt-3"><button className="btn" onClick={() => { setMode("menu"); setCur(null); setOver(null); }}>mode menu</button></div>
      </Shell>
    );
  }

  /* race board */
  if (!RACE) return <Shell path="/games/math" title="math sprint">loading...</Shell>;
  const leftMs = Math.max(0, RACE.endsAt - now);
  const names = mode === "online" ? m.seats.map((s) => s.name) : RACE.scores.map((_, i) => `p${i + 1}`);
  const leader = RACE.scores.indexOf(Math.max(...RACE.scores));
  const finished = m.room?.status === "finished" || (mode === "local" && RACE.endsAt === 0);

  return (
    <Shell path="/games/math" title="math sprint - race" help={`same question for everyone. first to ${TARGET} points wins.`} wide>
      {mode === "online" && <RoomLobby m={m} title="math race" onPlay={() => m.start(newRace(m.seats.length) as unknown as Record<string, unknown>, -1)} onLeave={async () => { if (await m.leave()) setMode("menu"); }} />}
      <Stats items={[["level", RACE.level], ["target", TARGET], ["time left", `${(leftMs / 1000).toFixed(1)}s`], ["you", mode === "online" ? (RACE.scores[m.mySeatIndex] ?? 0) : "-"]]} />
      <p className="mt-2 text-sm">
        {RACE.scores.map((p, i) => <span key={i} className={i === leader ? "inv px-1" : ""}>{i > 0 && "  "}{names[i] ?? i + 1}: {p}</span>)}
      </p>
      {!finished && (
        <form className="box mt-4" onSubmit={(e) => { e.preventDefault(); raceAnswer(); }}>
          <p className="text-4xl font-bold">{RACE.q} = ?</p>
          {mode === "local" && <p className="dim mt-1 text-sm">turn: {names[RACE.turn]}</p>}
          <div className="mt-3 flex gap-2">
            <input ref={inp} className="inp w-40 text-2xl" inputMode="numeric" value={rans} onChange={(e) => setRans(e.target.value.replace(/[^\d-]/g, ""))} />
            <button className="btn">answer</button>
          </div>
          {rmsg && <p className="dim mt-2 text-sm">&gt; {rmsg}</p>}
        </form>
      )}
      {RACE.log.length > 0 && <div className="box-dashed mt-3 text-xs">{RACE.log.map((l, i) => <p key={i}>&gt; {l}</p>)}</div>}
      {finished && (
        <Banner title={`${names[leader]} wins with ${Math.max(...RACE.scores)} points`}
          lines={RACE.scores.map((p, i) => `${names[i]}: ${p}`)}
          action={mode === "online" && m.mySeatIndex !== m.room?.hostSeat ? undefined : "rematch"} onAction={() => (mode === "online" ? m.rematch(newRace(m.seats.length) as unknown as Record<string, unknown>, -1) : setR(newRace(players)))} />
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={mode === "online" && (m.busy || m.mySeatIndex !== m.room?.hostSeat)} onClick={() => (mode === "online" ? m.rematch(newRace(m.seats.length) as unknown as Record<string, unknown>, -1) : setR(newRace(players)))}>restart race</button>
        <button className="btn" onClick={async () => { if (mode !== "online" || await m.leave()) setMode("menu"); }}>mode menu</button>
      </div>
    </Shell>
  );
}
