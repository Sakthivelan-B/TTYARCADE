import { randInt } from "./levels";
import type { Dir } from "./controls";
export type B = number[][];

export const addTile = (b: B): B => {
  const empty: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return b;
  const [r, c] = empty[randInt(empty.length)];
  const nb = b.map((x) => [...x]);
  nb[r][c] = randInt(10) === 0 ? 4 : 2;
  return nb;
};
export const fresh = () => addTile(addTile(Array.from({ length: 4 }, () => Array(4).fill(0))));

export function slideRow(row: number[]) {
  const a = row.filter(Boolean);
  let gain = 0;
  let merged = 0;
  for (let i = 0; i < a.length - 1; i++)
    if (a[i] === a[i + 1]) { a[i] *= 2; gain += a[i]; merged++; a.splice(i + 1, 1); }
  while (a.length < 4) a.push(0);
  return { row: a, gain, merged };
}
const rot = (b: B): B => b[0].map((_, c) => b.map((row) => row[c]).reverse());

export function move(b: B, d: Dir) {
  const turns = { L: 0, D: 1, R: 2, U: 3 }[d];
  let x = b;
  for (let i = 0; i < turns; i++) x = rot(x);
  let gain = 0, merged = 0;
  x = x.map((row) => { const s = slideRow(row); gain += s.gain; merged += s.merged; return s.row; });
  for (let i = 0; i < (4 - turns) % 4; i++) x = rot(x);
  const changed = JSON.stringify(x) !== JSON.stringify(b);
  return { b: changed ? addTile(x) : b, gain, merged, changed };
}
export const canMove = (b: B) => (["U", "D", "L", "R"] as Dir[]).some((d) => move(b, d).changed);
