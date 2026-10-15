"use client";
import { useEffect, useState } from "react";
import { Shell, Stats, Banner, lifeBar } from "@/components/term";
import { randInt, useBest, submitScore } from "@/lib/levels";
import { usePlayerName } from "@/lib/player";

type Cell = { mine: boolean; open: boolean; flag: boolean; adj: number };
type Mode = "menu" | "solo" | "local";

function config(level: number) {
  const n = Math.min(7 + level, 16);
  const density = Math.min(0.1 + level * 0.012, 0.21);
  return { n, mines: Math.round(n * n * density) };
}

function build(n: number, mines: number, sr: number, sc: number): Cell[][] {
  const b: Cell[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ mine: false, open: false, flag: false, adj: 0 })),
  );
  let placed = 0;
  let guard = 0;
  while (placed < mines && guard++ < 5000) {
    const r = randInt(n), c = randInt(n);
    if (b[r][c].mine || (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
    b[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      let a = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if (b[r + dr]?.[c + dc]?.mine) a++;
      b[r][c].adj = a;
    }
  return b;
}

function flood(b: Cell[][], r: number, c: number) {
  const st: [number, number][] = [[r, c]];
  while (st.length) {
    const [y, x] = st.pop()!;
    const cell = b[y]?.[x];
    if (!cell || cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.adj === 0 && !cell.mine)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) if (dr || dc) st.push([y + dr, x + dc]);
  }
}

const closed = (b: Cell[][]) => b.flat().filter((c) => !c.mine && !c.open).length;

export default function Minesweeper() {
  const [name] = usePlayerName();
  const [mode, setMode] = useState<Mode>("menu");
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [state, setState] = useState<"idle" | "play" | "won" | "lost">("idle");
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, report] = useBest("minesweeper");
  const [help, setHelp] = useState(true);
  // hot-seat: whose turn it is (a turn = one reveal; flags are free)
  const [turn, setTurn] = useState(0);
  const [players, setPlayers] = useState(2);
  const [safe, setSafe] = useState(0);

  const { n, mines } = config(level);

  useEffect(() => {
    if (state !== "play" || !board) return;
    const t = setInterval(() => setTime((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [state, board]);

  function start(l: number, keepLives = false) {
    setLevel(l);
    setBoard(null); // mines are placed on your first click (always safe)
    setState("play");
    setTime(0);
    setSafe(0);
    if (!keepLives) setLives(3);
    setTurn(0);
  }

  const clone = (b: Cell[][]) => b.map((r) => r.map((c) => ({ ...c })));

  function reveal(r: number, c: number) {
    if (state !== "play" || flagMode) return;
    const b = board ? clone(board) : build(n, mines, r, c);
    const cell = b[r][c];
    if (cell.flag) return;
    if (cell.open) return; // already revealed - nothing to do
    if (cell.mine) {
      b.forEach((row) => row.forEach((x) => { if (x.mine) x.open = true; }));
      setBoard(b);
      const left = lives - 1;
      setLives(left);
      if (left <= 0) {
        setState("lost");
        submitScore("minesweeper", level - 1, {}, name);
      } else {
        // same level, brand new field
        setTimeout(() => start(level, true), 900);
      }
      return;
    }
    flood(b, r, c);
    setBoard(b);
    setSafe((s) => s + 1);
    if (closed(b) === 0) {
      setState("won");
      report(level);
      submitScore("minesweeper", level, { time }, name);
    } else if (mode === "local") {
      setTurn((t) => (t + 1) % players);
    }
  }

  function flag(r: number, c: number) {
    if (state !== "play" || !board) return;
    const b = clone(board);
    if (b[r][c].open) return;
    b[r][c].flag = !b[r][c].flag;
    setBoard(b);
  }

  const flags = board ? board.flat().filter((c) => c.flag).length : 0;
  const size = n > 12 ? 26 : 30;

  if (mode === "menu") {
    return (
      <Shell path="/games/minesweeper" title="minesweeper" help="logic puzzle: numbers tell you how many mines touch a square.">
        <div className="box-dashed text-sm">
          <p className="font-bold">how to play (read this once)</p>
          <p>1. the field hides <b>{mines}</b> mines on a <b>{n}x{n}</b> grid at level {level}.</p>
          <p>2. click any square to open it. your <b>first click is always safe</b> (mines are placed after it).</p>
          <p>3. an opened square shows a number = how many of its 8 neighbours are mines. <b>·</b> means 0, and 0 opens all neighbours for you.</p>
          <p>4. sure a square is a mine? mark it: right-click on desktop, or switch <b>flag mode</b> on for touch.</p>
          <p>5. open every safe square to clear the field. opening a mine costs a life (3 lives).</p>
          <p className="dim mt-1">legend: [ ] closed · F flagged · * mine · 1-8 mine count · · zero</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={() => { setMode("solo"); start(1); }}>solo - endless levels</button>
          <button className="btn" onClick={() => { setMode("local"); start(1); }}>same device - take turns</button>
          <button className="btn" onClick={() => setHelp((h) => !h)}>{help ? "hide" : "show"} legend</button>
        </div>
        <p className="dim mt-2 text-sm">
          same-device players (2-10):{" "}
          <input
            className="inp w-16 text-center"
            type="number"
            min={2}
            max={10}
            value={players}
            onChange={(e) => setPlayers(Math.max(2, Math.min(10, Number(e.target.value) || 2)))}
          />{" "}
          - each turn one player makes one reveal, flags are free.
        </p>
      </Shell>
    );
  }

  return (
    <Shell path="/games/minesweeper" title="minesweeper" help={mode === "local" ? `same device: ${players} players take one reveal each` : "solo: clear the field to reach the next one"}>
      <Stats
        items={[
          ["level", level],
          ["field", `${n}x${n}`],
          ["mines left", mines - flags],
          ["safe left", board ? closed(board) : n * n - mines],
          ["time", `${time}s`],
          ["lives", lifeBar(lives, 3)],
          ["best", best],
          ...(mode === "local" ? ([["turn", `p${turn + 1}`]] as [string, string][]) : []),
        ]}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button className={`btn ${flagMode ? "on" : ""}`} onClick={() => setFlagMode((f) => !f)}>
          flag mode: {flagMode ? "on" : "off"}
        </button>
        <button className="btn" onClick={() => start(level, true)}>new field (same level)</button>
        <button className="btn" onClick={() => { setMode("menu"); setState("idle"); setBoard(null); }}>mode menu</button>
        <button className="btn" onClick={() => setHelp((h) => !h)}>{help ? "hide" : "show"} help</button>
      </div>

      {help && (
        <div className="box-dashed mt-3 text-xs">
          <p>click = open square · right-click (or flag mode + click) = mark a mine</p>
          <p>number = mines touching that square · <b>·</b> = 0 (opens neighbours) · <b>F</b> = your flag · <b>*</b> = mine</p>
          <p>win = every non-mine square open. a mine costs 1 life and gives a fresh field.</p>
        </div>
      )}

      {state !== "idle" && board === null && <p className="mt-4">click anywhere to open your first (always safe) square<span className="blink">_</span></p>}

      {board && (
        <div className="mt-3 max-w-full overflow-x-auto">
          <div className="inline-grid" style={{ gridTemplateColumns: `repeat(${n}, ${size}px)` }}>
            {board.map((row, r) =>
              row.map((cell, c) => {
                const txt = !cell.open && !cell.flag ? "" : cell.flag && !cell.open ? "F" : cell.mine ? "*" : cell.adj ? String(cell.adj) : "·";
                return (
                  <button
                    key={`${r}-${c}`}
                    className={`cell ${cell.open ? (cell.mine ? "on" : "") : "soft"}`}
                    style={{ width: size, height: size, fontWeight: 700, borderStyle: cell.flag && !cell.open ? "dashed" : "solid" }}
                    onClick={() => (flagMode ? flag(r, c) : reveal(r, c))}
                    onContextMenu={(e) => { e.preventDefault(); flag(r, c); }}
                    title={`row ${r + 1} col ${c + 1}`}
                  >
                    {txt}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      )}

      {state === "won" && (
        <Banner
          title={`field ${level} cleared in ${time}s`}
          lines={[`next field: ${config(level + 1).n}x${config(level + 1).n} with ${config(level + 1).mines} mines`]}
          action="next level"
          onAction={() => start(level + 1)}
        />
      )}
      {state === "lost" && (
        <Banner
          title="out of lives"
          lines={[`reached level ${level}`, "mines shown as *"]}
          action="restart level 1"
          onAction={() => start(1)}
        />
      )}
    </Shell>
  );
}
