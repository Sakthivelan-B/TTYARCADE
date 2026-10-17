import { freshPattern, shuffle, randInt } from "./levels";
export const W = 26;
export const H = 16;
export const PER_LEVEL = 5;
export type P = { x: number; y: number };
export type Dir = "U" | "D" | "L" | "R";

export type State = { snake: P[]; dir: Dir; food: P; walls: P[]; eaten: number; level: number; score: number; dead: boolean };

export const k = (p: P) => `${p.x},${p.y}`;

export function makeWalls(level: number): P[] {
  const count = Math.min(120, Math.max(0, (level - 1) * 4));
  return freshPattern("snake", () => {
    const candidates: P[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (y === Math.floor(H / 2) && x < 12) continue;
      candidates.push({ x, y });
    }
    return shuffle(candidates).slice(0, count);
  }, (w) => w.map(k).sort().join("|"));
}

export function placeFood(st: Pick<State, "snake" | "walls">): P {
  const used = new Set([...st.snake, ...st.walls].map(k));
  const free: P[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!used.has(`${x},${y}`)) free.push({ x, y });
  }
  return free[randInt(free.length)] ?? { x: -1, y: -1 };
}

export function newLevel(level: number, score: number): State {
  const y = Math.floor(H / 2);
  const snake = [{ x: 4, y }, { x: 3, y }, { x: 2, y }];
  const walls = makeWalls(level);
  return { snake, dir: "R", walls, food: placeFood({ snake, walls }), eaten: 0, level, score, dead: false };
}
