"use client";
import { useEffect, useState } from "react";
import { Shell, Stats, Banner } from "@/components/term";
import { randInt, submitScore } from "@/lib/levels";
import { RoomLobby, useRoom } from "@/components/multi";
import { usePlayerName } from "@/lib/player";

type C = "" | "X" | "O";
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function winner(b: C[]): { w: C; line: number[] } | null {
  for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { w: b[l[0]], line: l };
  return b.every(Boolean) ? { w: "", line: [] } : null;
}
const mark = (seat: number): C => (seat % 2 === 0 ? "X" : "O");

function minimax(b: C[], me: C, turn: C): { s: number; i: number } {
  const r = winner(b);
  if (r) return { s: r.w === "" ? 0 : r.w === me ? 10 : -10, i: -1 };
  let best = { s: turn === me ? -99 : 99, i: -1 };
  b.forEach((c, i) => {
    if (c) return;
    const nb = [...b] as C[];
    nb[i] = turn;
    const s = minimax(nb, me, turn === "X" ? "O" : "X").s;
    if (turn === me ? s > best.s : s < best.s) best = { s, i };
  });
  return best;
}
function cpuPick(b: C[], me: C, hard: boolean): number {
  const empty = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!hard && randInt(10) < 6) return empty[randInt(empty.length)];
  return minimax(b, me, me).i;
}

type Scores = { X: number; O: number; draw: number };
const emptyScores = (): Scores => ({ X: 0, O: 0, draw: 0 });
type Mode = "menu" | "local" | "cpu" | "online";

export default function XoX() {
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");
  const [hard, setHard] = useState(false);
  // local / cpu state
  const [b, setB] = useState<C[]>(Array(9).fill(""));
  const [turn, setTurn] = useState(0);
  const [sc, setSc] = useState<Scores>(emptyScores());
  // online
  const m = useRoom("tictactoe", 2);

  const OB = (m.room?.state?.b as C[] | undefined) ?? Array(9).fill("") as C[];
  const OS = (m.room?.state?.sc as Scores | undefined) ?? emptyScores();
  const board = mode === "online" ? OB : b;
  const scores = mode === "online" ? OS : sc;
  const seat = mode === "online" ? m.room?.turn ?? 0 : turn;
  const res = winner(board);

  function playLocal(i: number, cpu = false) {
    if (mode === "menu" || (mode === "cpu" && (turn === 1) !== cpu) || (mode === "online" && !cpu && !m.myTurn)) return;
    if (board[i] || res) return;
    const nb = [...board] as C[];
    nb[i] = mark(seat);
    const r = winner(nb);
    if (mode === "online") {
      const ns = { ...scores };
      if (r) r.w ? (ns[r.w] += 1) : (ns.draw += 1);
      m.move({
        state: { b: nb, sc: ns },
        expectTurn: seat,
        turn: r ? m.room!.turn : 1 - seat,
        status: r ? "finished" : "playing",
        score: r && r.w === mark(m.mySeatIndex) ? 1 : undefined,
      });
      if (r && r.w === mark(m.mySeatIndex)) submitScore("tictactoe", 1, { mode: "online" }, name);
    } else {
      setB(nb);
      setTurn(1 - seat);
      if (r) {
        setSc((s) => ({ ...s, [r.w || "draw"]: s[(r.w || "draw") as keyof Scores] + 1 }));
        if (mode === "cpu" && r.w === "X") submitScore("tictactoe", 1, { mode: hard ? "cpu-hard" : "cpu-easy" }, name);
      }
    }
  }

  // CPU turns (single player + online CPU seats)
  useEffect(() => {
    if (res) return;
    if (mode === "cpu" && turn === 1) {
      const t = setTimeout(() => playLocal(cpuPick(board, "O", hard), true), 350);
      return () => clearTimeout(t);
    }
    if (mode === "online" && m.room?.status === "playing" && m.seats[m.room.turn]?.isCpu) {
      const t = setTimeout(() => playLocal(cpuPick(board, mark(m.room!.turn), true), true), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, turn, board, res, m.room?.turn, m.room?.status, m.seats]);

  function reset(keepScores = true) {
    const s = keepScores ? scores : emptyScores();
    if (mode === "online") m.rematch({ b: Array(9).fill(""), sc: s }, 0);
    else { setB(Array(9).fill("")); setTurn(0); setSc(s); }
  }

  if (mode === "menu") {
    return (
      <Shell path="/games/tictactoe" title="xox (tic-tac-toe)" help="three of your marks in a row - horizontal, vertical or diagonal - wins.">
        <div className="box flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("local"); reset(false); }}>same device (2 players)</button>
          <button className="btn" onClick={() => { setMode("cpu"); setHard(false); reset(false); }}>vs cpu (easy)</button>
          <button className="btn" onClick={() => { setMode("cpu"); setHard(true); reset(false); }}>vs cpu (unbeatable)</button>
          <button className="btn" onClick={() => setMode("online")}>online room</button>
        </div>
        <p className="dim mt-2 text-sm">online: create a room and share the code. if no friend joins within ~9s a random-named cpu player takes the seat and plays properly - and if a real player joins later they take that seat over.</p>
      </Shell>
    );
  }

  if (mode === "online" && (!m.room || m.room.status === "waiting" || !m.me)) {
    return (
      <Shell path="/games/tictactoe" title="xox - online">
        <RoomLobby m={m} title="xox room" rules="2 players: seat 1 is X, seat 2 is O." onPlay={() => m.start({ b: Array(9).fill(""), sc: emptyScores() }, 0)} onLeave={() => { m.leave(); setMode("menu"); }} />
      </Shell>
    );
  }

  const you = mode === "online" ? mark(m.mySeatIndex) : mode === "cpu" ? "X" : mark(turn);

  return (
    <Shell path="/games/tictactoe" title="xox" help={`mode: ${mode === "cpu" ? (hard ? "cpu unbeatable" : "cpu easy") : mode}`}>
      {mode === "online" && (
        <RoomLobby m={m} title="xox room" onPlay={() => m.start({ b: Array(9).fill(""), sc: emptyScores() }, 0)} onLeave={() => { m.leave(); setMode("menu"); }} />
      )}
      <Stats items={[["X", scores.X], ["O", scores.O], ["draws", scores.draw], ...(mode === "online" ? ([["you", you]] as [string, string][]) : [])]} />
      <div className="mt-4 inline-grid grid-cols-3 gap-1">
        {board.map((c, i) => (
          <button
            key={i}
            className={`cell text-4xl font-bold ${res?.line?.includes(i) ? "on" : ""}`}
            style={{ width: 86, height: 86 }}
            onClick={() => playLocal(i)}
            disabled={!!c || !!res || (mode === "online" && !m.myTurn) || (mode === "cpu" && turn === 1)}
          >
            {c || <span className="dim text-sm">{i + 1}</span>}
          </button>
        ))}
      </div>
      {!res && (
        <p className="mt-3">
          &gt; {mode === "online" ? `${m.seats[seat]?.name ?? "?"} (${mark(seat)}) to move` : `${mark(seat)} to move`}
        </p>
      )}
      {res && (
        <Banner
          title={res.w === "" ? "draw" : `${res.w} wins`}
          lines={mode === "online" ? [`${m.seats.find((s) => mark(s.seat) === res.w)?.name ?? res.w} takes the round`] : []}
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
