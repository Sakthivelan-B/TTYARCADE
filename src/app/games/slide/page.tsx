"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell, Stats, Banner, Pad } from "@/components/term";
import { freshPattern, pick, useBest, submitScore } from "@/lib/levels";
import { useControls } from "@/lib/controls";

function solved(b: number[]) {
  return b.every((v, i) => (i === b.length - 1 ? v === 0 : v === i + 1));
}

function makeBoard(level: number) {
  const n = Math.min(3 + Math.floor((level - 1) / 3), 6);
  const steps = 15 + level * 15;
  return freshPattern("slide", () => {
    const b = [...Array.from({ length: n * n - 1 }, (_, i) => i + 1), 0];
    let blank = n * n - 1;
    let prev = -1;
    for (let s = 0; s < steps || solved(b); s++) {
      const r = Math.floor(blank / n), c = blank % n;
      const opts = [r > 0 && blank - n, r < n - 1 && blank + n, c > 0 && blank - 1, c < n - 1 && blank + 1]
        .filter((x): x is number => x !== false && x !== prev);
      const t = pick(opts);
      b[blank] = b[t];
      b[t] = 0;
      prev = blank;
      blank = t;
    }
    return { n, b };
  }, (x) => x.b.join(","));
}

export default function Slide() {
  const [level, setLevel] = useState(1);
  const [st, setSt] = useState<{ n: number; b: number[] } | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [best, report] = useBest("slide");

  function start(l: number) {
    setSt(makeBoard(l));
    setMoves(0);
    setWon(false);
  }

  const tryMove = useCallback((i: number) => {
    if (!st || won) return;
    const { n, b } = st;
    const blank = b.indexOf(0);
    const adj = (Math.abs(i - blank) === 1 && Math.floor(i / n) === Math.floor(blank / n)) || Math.abs(i - blank) === n;
    if (!adj) return;
    const nb = [...b];
    nb[blank] = nb[i];
    nb[i] = 0;
    setSt({ n, b: nb });
    setMoves((m) => m + 1);
    if (solved(nb)) {
      setWon(true);
      report(level);
      submitScore("slide", level, { moves: moves + 1 });
    }
  }, [st, won, level, moves, report]);

  // arrow = direction the TILE moves into the blank
  const dirMove = useCallback((d: "U" | "D" | "L" | "R") => {
    if (!st) return;
    const blank = st.b.indexOf(0);
    const n = st.n;
    const r = Math.floor(blank / n), c = blank % n;
    if (d === "U" && r < n - 1) tryMove(blank + n);
    if (d === "D" && r > 0) tryMove(blank - n);
    if (d === "L" && c < n - 1) tryMove(blank + 1);
    if (d === "R" && c > 0) tryMove(blank - 1);
  }, [st, tryMove]);

  useControls(dirMove);

  const size = st ? Math.floor(300 / st.n) : 60;

  return (
    <Shell path="/games/slide" title="slide puzzle" help="order tiles 1..N with the gap last. click a tile next to the gap, or use arrows. bigger boards every 3 levels.">
      <Stats items={[["level", level], ["size", st ? `${st.n}x${st.n}` : "-"], ["moves", moves], ["best", best]]} />
      {!st ? (
        <button className="btn mt-4" onClick={() => start(1)}>start</button>
      ) : (
        <>
          <div className="mt-4 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${st.n}, ${size}px)` }}>
            {st.b.map((v, i) => (
              <button
                key={i}
                className={`cell text-lg font-bold ${v === 0 ? "" : v === i + 1 ? "on" : ""}`}
                style={{ width: size, height: size, borderStyle: v === 0 ? "dashed" : "solid" }}
                onClick={() => tryMove(i)}
              >
                {v || ""}
              </button>
            ))}
          </div>
          <p className="dim mt-1 text-xs">inverted = tile in correct place</p>
          <Pad onDir={dirMove} />
        </>
      )}
      {won && (
        <Banner title={`level ${level} solved`} lines={[`${moves} moves`]} action="next level" onAction={() => { const n = level + 1; setLevel(n); start(n); }} />
      )}
    </Shell>
  );
}
