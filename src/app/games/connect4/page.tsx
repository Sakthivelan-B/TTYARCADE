"use client";
import { useEffect, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { randInt, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
import { usePlayerName } from "@/lib/player";

const R = 6, C = 7;
type P = "" | "X" | "O";
type Scores = { X: number; O: number; draw: number };
const emptyScores = (): Scores => ({ X: 0, O: 0, draw: 0 });
const mark = (seat: number): P => (seat % 2 === 0 ? "X" : "O");
const emptyBoard = (): P[] => Array(R * C).fill("") as P[];

function winner(b: P[]): { w: P; cells: number[] } | null {
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= R || c >= C ? null : b[r * C + c]);
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const v = at(r, c);
      if (!v) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
        const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
        if (cells.every(([y, x]) => at(y, x) === v)) return { w: v, cells: cells.map(([y, x]) => y * C + x) };
      }
    }
  return b.every(Boolean) ? { w: "", cells: [] } : null;
}

function dropRow(b: P[], c: number): number {
  for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) return r;
  return -1;
}

/** greedy cpu: win > block > centre-ish > random */
function cpuPick(b: P[], me: P): number {
  const other = me === "X" ? "O" : "X";
  const legal = Array.from({ length: C }, (_, c) => c).filter((c) => dropRow(b, c) >= 0);
  const withMove = (c: number, m: P) => {
    const r = dropRow(b, c);
    if (r < 0) return null;
    const nb = [...b] as P[];
    nb[r * C + c] = m;
    return nb;
  };
  for (const c of legal) { const nb = withMove(c, me); if (nb && winner(nb)?.w === me) return c; }
  for (const c of legal) { const nb = withMove(c, other); if (nb && winner(nb)?.w === other) return c; }
  const ordered = [...legal].sort((x, y) => Math.abs(x - 3) - Math.abs(y - 3));
  return randInt(10) < 7 ? ordered[0] : legal[randInt(legal.length)];
}

type Mode = "menu" | "local" | "cpu" | "online";

export default function Connect4() {
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");
  const [b, setB] = useState<P[]>(emptyBoard());
  const [turn, setTurn] = useState(0);
  const [sc, setSc] = useState<Scores>(emptyScores());
  const m = useRoom("connect4", 2);

  const board = mode === "online" ? ((m.room?.state?.b as P[] | undefined) ?? emptyBoard()) : b;
  const scores = mode === "online" ? ((m.room?.state?.sc as Scores | undefined) ?? emptyScores()) : sc;
  const seat = mode === "online" ? m.room?.turn ?? 0 : turn;
  const res = winner(board);

  function drop(c: number) {
    if (res) return;
    const r = dropRow(board, c);
    if (r < 0) return;
    const nb = [...board] as P[];
    nb[r * C + c] = mark(seat);
    const w = winner(nb);
    if (mode === "online") {
      const ns = { ...scores };
      if (w) w.w ? (ns[w.w] += 1) : (ns.draw += 1);
      m.move({
        state: { b: nb, sc: ns },
        expectTurn: m.mySeatIndex,
        turn: w ? m.room!.turn : 1 - m.mySeatIndex,
        status: w ? "finished" : "playing",
        score: w && w.w === mark(m.mySeatIndex) ? 1 : undefined,
      });
      if (w && w.w === mark(m.mySeatIndex)) submitScore("connect4", 1, { mode: "online" }, name);
    } else {
      setB(nb);
      setTurn(1 - seat);
      if (w) {
        setSc((s) => ({ ...s, [w.w || "draw"]: s[(w.w || "draw") as keyof Scores] + 1 }));
        if (mode === "cpu" && w.w === "X") submitScore("connect4", 1, { mode: "cpu" }, name);
      }
    }
  }

  // keyboard: 1-7 drops into that column (declared before any early return)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= C && !winner(board)) drop(n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (res) return;
    if (mode === "cpu" && turn === 1) {
      const t = setTimeout(() => drop(cpuPick(board, "O")), 400);
      return () => clearTimeout(t);
    }
    if (mode === "online" && m.room?.status === "playing" && m.seats[m.room.turn]?.isCpu) {
      const t = setTimeout(() => drop(cpuPick(board, mark(m.room!.turn))), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, turn, board, res, m.room?.turn, m.room?.status, m.seats]);

  function reset(keepScores = true) {
    const s = keepScores ? scores : emptyScores();
    if (mode === "online") m.rematch({ b: emptyBoard(), sc: s }, 0);
    else { setB(emptyBoard()); setTurn(0); setSc(s); }
  }

  if (mode === "menu") {
    return (
      <Shell path="/games/connect4" title="connect four" help="drop pieces into a column; first to line up 4 (row, column or diagonal) wins.">
        <div className="box flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("local"); reset(false); }}>same device (2 players)</button>
          <button className="btn" onClick={() => { setMode("cpu"); reset(false); }}>vs cpu</button>
          <button className="btn" onClick={() => setMode("online")}>online room</button>
        </div>
        <p className="dim mt-2 text-sm">keys 1-7 drop into that column. online rooms fill with a random-named cpu if nobody joins.</p>
      </Shell>
    );
  }

  if (mode === "online" && (!m.room || m.room.status === "waiting" || !m.me)) {
    return (
      <Shell path="/games/connect4" title="connect four - online">
        <RoomLobby m={m} title="connect-four room" rules="2 players: seat 1 is X, seat 2 is O." onPlay={() => m.start({ b: emptyBoard(), sc: emptyScores() }, 0)} onLeave={() => { m.leave(); setMode("menu"); }} />
      </Shell>
    );
  }

  return (
    <Shell path="/games/connect4" title="connect four" help={`mode: ${mode}`}>
      {mode === "online" && <RoomLobby m={m} title="connect-four room" onPlay={() => m.start({ b: emptyBoard(), sc: emptyScores() }, 0)} onLeave={() => { m.leave(); setMode("menu"); }} />}
      <Stats items={[["X", scores.X], ["O", scores.O], ["draws", scores.draw]]} />
      <div className="mt-4 inline-block">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${C}, 46px)` }}>
          {Array.from({ length: C }).map((_, c) => (
            <button key={c} className="btn" style={{ padding: 0 }} onClick={() => drop(c)} disabled={!!res || (mode === "online" && !m.myTurn)}>
              {c + 1}v
            </button>
          ))}
        </div>
        <div className="box mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${C}, 46px)`, padding: 4 }}>
          {board.map((v, i) => (
            <button
              key={i}
              onClick={() => drop(i % C)}
              disabled={!!res || (mode === "online" && !m.myTurn)}
              className={`cell text-2xl font-bold ${res?.cells?.includes(i) ? "on" : ""}`}
              style={{ width: 46, height: 46, borderRadius: "50%" }}
            >
              {v || <span className="dim">·</span>}
            </button>
          ))}
        </div>
      </div>
      {!res && <p className="mt-3">&gt; {mark(seat)} to move{mode === "online" ? ` (${m.seats[seat]?.name ?? "?"})` : ""}</p>}
      {res && (
        <Banner
          title={res.w === "" ? "draw - board full" : `${res.w} connects four`}
          action="next round"
          onAction={() => reset(true)}
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn" onClick={() => reset(true)}>reset board</button>
        <button className="btn" onClick={() => reset(false)}>reset scores</button>
        <button className="btn" onClick={() => { if (mode === "online") m.leave(); setMode("menu"); }}>mode menu</button>
      </div>
    </Shell>
  );
}
