"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner, lifeBar } from "@/components/term";
import { freshPattern, randInt, useBest, submitScore } from "@/lib/levels";

const MAX_LIVES = 3;

function config(level: number) {
  const n = Math.min(3 + Math.floor((level - 1) / 2), 8); // grid side
  const count = Math.min(2 + level, Math.floor(n * n * 0.55)); // lit cells
  const showMs = Math.max(700, 1300 + count * 120 - level * 40);
  return { n, count, showMs };
}

function makePattern(level: number): { n: number; cells: number[] } {
  const { n, count } = config(level);
  return freshPattern(
    "matrix",
    () => {
      const s = new Set<number>();
      while (s.size < count) s.add(randInt(n * n));
      return { n, cells: [...s].sort((a, b) => a - b) };
    },
    (p) => `${p.n}:${p.cells.join(",")}`,
  );
}

export default function MemoryMatrix() {
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [pat, setPat] = useState<{ n: number; cells: number[] } | null>(null);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "fail" | "over">("idle");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [best, report] = useBest("matrix");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLevel(l: number) {
    const p = makePattern(l);
    setPat(p);
    setPicked(new Set());
    setWrong(null);
    setPhase("show");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("input"), config(l).showMs);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function newGame() {
    setLevel(1);
    setLives(MAX_LIVES);
    startLevel(1);
  }

  function click(i: number) {
    if (phase !== "input" || !pat || picked.has(i)) return;
    if (!pat.cells.includes(i)) {
      setWrong(i);
      const left = lives - 1;
      setLives(left);
      if (left <= 0) {
        setPhase("over");
        report(level - 1);
        submitScore("matrix", level - 1, { level });
      } else setPhase("fail");
      return;
    }
    const next = new Set(picked).add(i);
    setPicked(next);
    if (next.size === pat.cells.length) {
      const nl = level + 1;
      setLevel(nl);
      report(level);
      timer.current = setTimeout(() => startLevel(nl), 600);
    }
  }

  const n = pat?.n ?? 3;
  const size = Math.min(56, Math.floor(320 / n));

  return (
    <Shell path="/games/matrix" title="memory matrix" help="watch the lit cells, then click them all. one wrong click costs a life. levels never repeat.">
      <Stats items={[["level", level], ["lives", lifeBar(lives, MAX_LIVES)], ["best", best], ["cells", pat ? pat.cells.length : "-"]]} />
      {phase === "idle" ? (
        <button className="btn mt-4" onClick={newGame}>start</button>
      ) : (
        <>
          <p className="mt-3 text-sm">
            {phase === "show" && "> memorize..."}
            {phase === "input" && `> recall: ${picked.size}/${pat?.cells.length}`}
          </p>
          <div className="mt-2 inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, ${size}px)` }}>
            {Array.from({ length: n * n }).map((_, i) => {
              const lit = phase === "show" || phase === "fail" || phase === "over" ? pat?.cells.includes(i) : picked.has(i);
              return (
                <button
                  key={`${level}-${i}`}
                  className={`cell ${lit ? "on" : ""}`}
                  style={{ width: size, height: size }}
                  onClick={() => click(i)}
                  disabled={phase !== "input"}
                >
                  {wrong === i ? "X" : lit ? "#" : "."}
                </button>
              );
            })}
          </div>
        </>
      )}
      {phase === "fail" && (
        <Banner title="wrong cell" lines={["that was the pattern. a NEW one is generated."]} action="retry level" onAction={() => startLevel(level)} />
      )}
      {phase === "over" && (
        <Banner title="game over" lines={[`reached level ${level}`]} action="play again" onAction={newGame} />
      )}
    </Shell>
  );
}
