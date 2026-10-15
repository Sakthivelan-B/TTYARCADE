"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner, Pad } from "@/components/term";
import { freshPattern, randInt, useBest, submitScore } from "@/lib/levels";
import { useControls } from "@/lib/controls";

const W = 26;
const H = 16;
const PER_LEVEL = 5;
type P = { x: number; y: number };
type Dir = "U" | "D" | "L" | "R";

type State = { snake: P[]; dir: Dir; food: P; walls: P[]; eaten: number; level: number; score: number; dead: boolean };

const k = (p: P) => `${p.x},${p.y}`;

function makeWalls(level: number): P[] {
  const count = (level - 1) * 4;
  return freshPattern("snake", () => {
    const s = new Map<string, P>();
    while (s.size < count) {
      const p = { x: randInt(W), y: randInt(H) };
      if (p.y === Math.floor(H / 2) && p.x < 12) continue; // keep spawn lane clear
      s.set(k(p), p);
    }
    return [...s.values()];
  }, (w) => w.map(k).sort().join("|"));
}

function placeFood(st: Pick<State, "snake" | "walls">): P {
  const used = new Set([...st.snake, ...st.walls].map(k));
  for (;;) {
    const p = { x: randInt(W), y: randInt(H) };
    if (!used.has(k(p))) return p;
  }
}

function newLevel(level: number, score: number): State {
  const y = Math.floor(H / 2);
  const snake = [{ x: 4, y }, { x: 3, y }, { x: 2, y }];
  const walls = makeWalls(level);
  return { snake, dir: "R", walls, food: placeFood({ snake, walls }), eaten: 0, level, score, dead: false };
}

export default function Snake() {
  const [st, setSt] = useState<State | null>(null);
  const [running, setRunning] = useState(false);
  const [best, report] = useBest("snake");
  const queued = useRef<Dir | null>(null);

  const turn = useCallback((d: Dir) => { queued.current = d; }, []);

  // arrows / WASD / user-remapped keys / joystick
  useControls(turn);

  const speed = st ? Math.max(55, 150 - st.level * 12) : 150;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSt((s) => {
        if (!s || s.dead) return s;
        let dir = s.dir;
        const q = queued.current;
        queued.current = null;
        const opp: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };
        if (q && q !== opp[dir]) dir = q;
        const h = s.snake[0];
        const n = { x: h.x + (dir === "L" ? -1 : dir === "R" ? 1 : 0), y: h.y + (dir === "U" ? -1 : dir === "D" ? 1 : 0) };
        const hit = n.x < 0 || n.y < 0 || n.x >= W || n.y >= H || s.walls.some((w) => w.x === n.x && w.y === n.y) || s.snake.slice(0, -1).some((p) => p.x === n.x && p.y === n.y);
        if (hit) return { ...s, dead: true };
        const ate = n.x === s.food.x && n.y === s.food.y;
        const snake = [n, ...s.snake];
        if (!ate) snake.pop();
        if (ate) {
          const eaten = s.eaten + 1;
          const score = s.score + s.level;
          if (eaten >= PER_LEVEL) return newLevel(s.level + 1, score);
          return { ...s, snake, dir, eaten, score, food: placeFood({ snake, walls: s.walls }) };
        }
        return { ...s, snake, dir };
      });
    }, speed);
    return () => clearInterval(t);
  }, [running, speed]);

  useEffect(() => {
    if (st?.dead && running) {
      setRunning(false);
      report(st.score);
      submitScore("snake", st.score, { level: st.level });
    }
  }, [st, running, report]);

  function start() {
    setSt(newLevel(1, 0));
    queued.current = null;
    setRunning(true);
  }

  let screen = "";
  if (st) {
    const body = new Set(st.snake.slice(1).map(k));
    const walls = new Set(st.walls.map(k));
    const head = k(st.snake[0]);
    const rows = ["+" + "-".repeat(W) + "+"];
    for (let y = 0; y < H; y++) {
      let r = "|";
      for (let x = 0; x < W; x++) {
        const c = `${x},${y}`;
        r += c === head ? "@" : body.has(c) ? "o" : walls.has(c) ? "#" : x === st.food.x && y === st.food.y ? "*" : " ";
      }
      rows.push(r + "|");
    }
    rows.push("+" + "-".repeat(W) + "+");
    screen = rows.join("\n");
  }

  return (
    <Shell path="/games/snake" title="snake" help={`arrows / WASD. eat * to grow. every ${PER_LEVEL} food = new level with new random walls (#) and more speed.`}>
      <Stats items={[["level", st?.level ?? 1], ["food", `${st?.eaten ?? 0}/${PER_LEVEL}`], ["score", st?.score ?? 0], ["best", best]]} />
      {st && (
        <div className="mt-3 inline-block max-w-full overflow-x-auto">
          <pre className="screen" style={{ fontSize: 16, lineHeight: 1 }}>{screen}</pre>
        </div>
      )}
      {!running && !st?.dead && <div><button className="btn mt-4" onClick={start}>start</button></div>}
      {running && <Pad onDir={turn} />}
      {st?.dead && <Banner title="crashed" lines={[`score ${st.score} at level ${st.level}`]} action="play again" onAction={start} />}
    </Shell>
  );
}
