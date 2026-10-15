"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell, Stats, Banner, Pad } from "@/components/term";
import { randInt, useBest, submitScore } from "@/lib/levels";
import { useControls, type Dir } from "@/lib/controls";
import { usePlayerName } from "@/lib/player";

type B = number[][];

const addTile = (b: B): B => {
  const empty: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return b;
  const [r, c] = empty[randInt(empty.length)];
  const nb = b.map((x) => [...x]);
  nb[r][c] = randInt(10) === 0 ? 4 : 2;
  return nb;
};
const fresh = () => addTile(addTile(Array.from({ length: 4 }, () => Array(4).fill(0))));

function slideRow(row: number[]) {
  const a = row.filter(Boolean);
  let gain = 0;
  let merged = 0;
  for (let i = 0; i < a.length - 1; i++)
    if (a[i] === a[i + 1]) { a[i] *= 2; gain += a[i]; merged++; a.splice(i + 1, 1); }
  while (a.length < 4) a.push(0);
  return { row: a, gain, merged };
}
const rot = (b: B): B => b[0].map((_, c) => b.map((row) => row[c]).reverse());

function move(b: B, d: Dir) {
  const turns = { L: 0, D: 1, R: 2, U: 3 }[d];
  let x = b;
  for (let i = 0; i < turns; i++) x = rot(x);
  let gain = 0, merged = 0;
  x = x.map((row) => { const s = slideRow(row); gain += s.gain; merged += s.merged; return s.row; });
  for (let i = 0; i < (4 - turns) % 4; i++) x = rot(x);
  const changed = JSON.stringify(x) !== JSON.stringify(b);
  return { b: changed ? addTile(x) : b, gain, merged, changed };
}
const canMove = (b: B) => (["U", "D", "L", "R"] as Dir[]).some((d) => move(b, d).changed);

export default function G2048() {
  const [name] = usePlayerName();
  const [b, setB] = useState<B>(() => fresh());
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [last, setLast] = useState("");
  const [help, setHelp] = useState(true);
  const [best, report] = useBest("2048");

  const go = useCallback((d: Dir) => {
    if (over) return;
    setB((cur) => {
      const r = move(cur, d);
      if (!r.changed) {
        setLast("no move that way - nothing slid");
        return cur;
      }
      setScore((s) => s + r.gain);
      setLast(
        `${d === "U" ? "up" : d === "D" ? "down" : d === "L" ? "left" : "right"}: ` +
          (r.merged ? `${r.merged} merge${r.merged > 1 ? "s" : ""} +${r.gain}` : "slide, no merge") +
          " - a new 2 or 4 appeared",
      );
      const nb = r.b;
      if (!canMove(nb)) {
        setOver(true);
        report(score + r.gain);
        submitScore("2048", score + r.gain, { max: Math.max(...nb.flat()) }, name);
      }
      return nb;
    });
  }, [over, score, report, name]);

  useControls(go);
  const maxTile = Math.max(...b.flat());

  return (
    <Shell path="/games/2048" title="2048" help="slide all tiles in one direction; equal numbers merge into their sum.">
      <div className="box-dashed text-sm">
        <p className="font-bold">the concept (one paragraph)</p>
        <p>
          2048 is a 4x4 sliding-number puzzle. Every move pushes <b>all</b> tiles as far as they
          can go in one direction (up / down / left / right). When two tiles with the <b>same
          number</b> collide they merge into one tile worth their sum: 2+2=4, 4+4=8, 8+8=16 ...
          After each move one new tile (2, sometimes 4) appears in a random empty square. Your aim
          is to build a <b>2048</b> tile; you lose when the grid is full and no two neighbours are
          equal, because then nothing can move.
        </p>
        <p className="mt-2 font-bold">how to play here</p>
        <p>1. press an arrow key (or WASD), use the on-screen pad, or your joystick - see settings.</p>
        <p>2. keep the big tiles in one corner - that is the usual winning strategy.</p>
        <p>3. score = sum of every merge you make.</p>
        <p className="dim mt-1">tiles shown plain are new/small; inverted (white on black) tiles are 128 and up.</p>
      </div>

      <Stats items={[["score", score], ["max tile", maxTile], ["goal", 2048], ["best", best]]} />

      <div className="mt-4 inline-grid grid-cols-4 gap-1">
        {b.flat().map((v, i) => (
          <div
            key={i}
            className={`cell font-bold ${v >= 128 ? "on" : v ? "" : "soft"}`}
            style={{ width: 74, height: 74, cursor: "default", fontSize: v >= 1024 ? 18 : 22, borderWidth: v >= 16 && v < 128 ? 2 : 1, borderColor: v ? "var(--fg)" : undefined }}
          >
            {v || "."}
          </div>
        ))}
      </div>

      <p className="mt-2 text-sm">&gt; {last || "make your first move"}</p>
      <Pad onDir={go} />

      <div className="mt-3 flex gap-2">
        <button className="btn" onClick={() => { setB(fresh()); setScore(0); setOver(false); setLast(""); }}>new game</button>
        <button className="btn" onClick={() => setHelp((h) => !h)}>{help ? "hide" : "show"} merge table</button>
      </div>
      {help && (
        <pre className="screen dim mt-2 text-xs" style={{ lineHeight: 1.6 }}>
{`merge table:  2+2=4    4+4=8    8+8=16   16+16=32
              32+32=64 64+64=128 128+128=256 256+256=512
              512+512=1024   1024+1024=2048  (goal)
rule: a tile merges only ONCE per move.`}
        </pre>
      )}

      {maxTile >= 2048 && !over && <p className="mt-2">&gt; 2048 reached - you can keep going for 4096.</p>}
      {over && (
        <Banner title="no moves left" lines={[`final score ${score}, biggest tile ${maxTile}`]} action="new game" onAction={() => { setB(fresh()); setScore(0); setOver(false); setLast(""); }} />
      )}
    </Shell>
  );
}
