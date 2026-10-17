export type Bag = Record<string, any>;
export type PackState = {
  v: 1;
  game: string;
  level: number;
  players: number;
  turn: number;
  phase: "observe" | "play" | "won" | "lost";
  scores: number[];
  lives: number;
  message: string;
  data: Bag;
  options: Bag;
};
export type Command = { type: string; [key: string]: unknown };
export type Random = () => number;
export function random(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedNow = () => {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 4294967296);
  }
};
export const int = (rng: Random, n: number) => Math.floor(rng() * n);
export const pick = <T>(rng: Random, a: readonly T[]) => a[int(rng, a.length)];
export function shuffle<T>(rng: Random, a: readonly T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export function base(
  game: string,
  level: number,
  players: number,
  options: Bag = {},
): PackState {
  return {
    v: 1,
    game,
    level: Math.max(
      1,
      Math.min(Number.MAX_SAFE_INTEGER, Math.floor(level) || 1),
    ),
    players,
    turn: 0,
    phase: "play",
    scores: Array(players).fill(0),
    lives: 3,
    message: "",
    data: {},
    options,
  };
}
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function index(value: unknown, max: number): number {
  check(
    typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value < max,
    "Choose a valid position.",
  );
  return value;
}
export function text(value: unknown, max = 256): string {
  check(
    typeof value === "string" && value.length <= max,
    "Enter a valid answer.",
  );
  return value.trim();
}
export function win(s: PackState, who = 0, message = "Level complete.") {
  s.phase = "won";
  s.scores[who] += s.level;
  s.message = message;
}
export function fail(s: PackState, message = "Not quite. Try again.") {
  s.lives--;
  s.message = message;
  if (s.lives <= 0) {
    s.phase = "lost";
    s.message += " Round over.";
  }
}
export function finish(s: PackState, totals: number[], message: string) {
  s.phase = "won";
  s.scores = totals;
  s.message = message;
}
export function nextTurn(s: PackState) {
  s.turn = (s.turn + 1) % s.players;
}
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export function runs(a: number[]) {
  const out: number[] = [];
  let n = 0;
  for (const v of [...a, 0]) {
    if (v === 1) n++;
    else if (n) {
      out.push(n);
      n = 0;
    }
  }
  return out.length ? out : [0];
}
export function permutations<T>(a: T[]): T[][] {
  if (!a.length) return [[]];
  return a.flatMap((v, i) =>
    permutations(a.filter((_, j) => j !== i)).map((p) => [v, ...p]),
  );
}
export function compare(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
