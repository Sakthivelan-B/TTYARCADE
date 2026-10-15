"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell, Stats, Banner, Pad } from "@/components/term";
import { freshPattern, randInt, shuffle, useBest, submitScore } from "@/lib/levels";
import { useControls } from "@/lib/controls";

type Grid = boolean[][]; // true = wall

function genMaze(w: number, h: number): Grid {
  const H = h * 2 + 1;
  const W = w * 2 + 1;
  const g: Grid = Array.from({ length: H }, () => Array(W).fill(true));
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const stack: [number, number][] = [[randInt(h), randInt(w)]];
  seen[stack[0][0]][stack[0][1]] = true;
  g[stack[0][0] * 2 + 1][stack[0][1] * 2 + 1] = false;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nbrs = shuffle([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][])
      .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < h && nc < w && !seen[nr][nc]);
    if (!nbrs.length) { stack.pop(); continue; }
    const [nr, nc] = nbrs[0];
    seen[nr][nc] = true;
    g[nr * 2 + 1][nc * 2 + 1] = false;
    g[r + nr + 1][c + nc + 1] = false; // knock wall between
    stack.push([nr, nc]);
  }
  return g;
}

function config(level: number) {
  return {
    w: Math.min(5 + level * 2, 29),
    h: Math.min(4 + level, 15),
    fog: level >= 4 ? Math.max(3, 7 - Math.floor((level - 4) / 2)) : 0,
  };
}

export default function Maze() {
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [pos, setPos] = useState<[number, number]>([1, 1]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [won, setWon] = useState(false);
  const [best, report] = useBest("maze");

  const start = useCallback((l: number) => {
    const { w, h } = config(l);
    setGrid(freshPattern("maze", () => genMaze(w, h), (g) => g.map((r) => r.map((x) => (x ? 1 : 0)).join("")).join("")));
    setPos([1, 1]);
    setMoves(0);
    setTime(0);
    setWon(false);
  }, []);

  useEffect(() => {
    if (!grid || won) return;
    const t = setInterval(() => setTime((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [grid, won]);

  const move = useCallback((d: "U" | "D" | "L" | "R") => {
    if (!grid || won) return;
    setPos(([r, c]) => {
      const nr = r + (d === "U" ? -1 : d === "D" ? 1 : 0);
      const nc = c + (d === "L" ? -1 : d === "R" ? 1 : 0);
      if (grid[nr]?.[nc] !== false) return [r, c];
      setMoves((m) => m + 1);
      if (nr === grid.length - 2 && nc === grid[0].length - 2) {
        setWon(true);
        report(level);
        submitScore("maze", level, { time });
      }
      return [nr, nc];
    });
  }, [grid, won, level, time, report]);

  useControls(move);

  const fog = config(level).fog;
  const screen = grid
    ? grid.map((row, r) => row.map((wall, c) => {
        if (r === pos[0] && c === pos[1]) return "@";
        if (fog && Math.abs(r - pos[0]) + Math.abs(c - pos[1]) > fog) return r === grid.length - 2 && c === row.length - 2 ? "E" : "░";
        if (r === grid.length - 2 && c === row.length - 2) return "E";
        return wall ? "█" : " ";
      }).join("")).join("\n")
    : "";

  return (
    <Shell path="/games/maze" title="ascii maze" help="move @ to E with arrows / WASD. every maze is newly generated. fog of war from level 4." wide>
      <Stats items={[["level", level], ["moves", moves], ["time", `${time}s`], ["fog", fog ? `r=${fog}` : "off"], ["best", best]]} />
      {!grid ? (
        <button className="btn mt-4" onClick={() => start(1)}>start</button>
      ) : (
        <>
          <div className="box mt-3 inline-block max-w-full overflow-x-auto">
            <pre className="screen" style={{ lineHeight: 1, fontSize: 16 }}>{screen}</pre>
          </div>
          <Pad onDir={move} />
        </>
      )}
      {won && (
        <Banner title={`level ${level} escaped`} lines={[`${moves} moves in ${time}s. next maze is bigger.`]} action="next maze" onAction={() => { const n = level + 1; setLevel(n); start(n); }} />
      )}
    </Shell>
  );
}
