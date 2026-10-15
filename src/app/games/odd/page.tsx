"use client";
import { useEffect, useRef, useState } from "react";
import { Shell, Stats, Banner, lifeBar } from "@/components/term";
import { freshPattern, pick, randInt, useBest, submitScore } from "@/lib/levels";

// tiers from obvious to very subtle (monospace-similar glyphs)
const TIERS: [string, string][][] = [
  [["O", "X"], ["#", "+"], ["A", "V"], ["@", "%"], ["=", "|"]],
  [["E", "F"], ["M", "N"], ["b", "d"], ["p", "q"], ["6", "9"], ["C", "G"]],
  [["O", "Q"], ["8", "B"], ["5", "S"], ["2", "Z"], ["u", "v"], ["h", "n"]],
  [["O", "0"], ["l", "1"], ["I", "l"], ["m", "n"], [",", "."], [";", ":"]],
  [["rn", "m"], ["vv", "w"], ["cl", "d"], ["1l", "ll"], ["O0", "00"], ["il", "li"]],
];
const MAX_LIVES = 3;

function makeLevel(level: number) {
  const n = Math.min(4 + Math.floor(level / 2), 12);
  const tier = TIERS[Math.min(Math.floor((level - 1) / 3), TIERS.length - 1)];
  return freshPattern("odd", () => {
    const pair = pick(tier);
    const flip = randInt(2) === 1;
    return { n, base: flip ? pair[1] : pair[0], odd: flip ? pair[0] : pair[1], at: randInt(n * n) };
  }, (p) => `${p.n}:${p.base}:${p.odd}:${p.at}`);
}

export default function OddOneOut() {
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [lv, setLv] = useState<ReturnType<typeof makeLevel> | null>(null);
  const [time, setTime] = useState(0);
  const [over, setOver] = useState(false);
  const [best, report] = useBest("odd");
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(l: number) {
    setLv(makeLevel(l));
    setTime(Math.max(5, 15 - Math.floor(l / 3)) * 10);
  }

  useEffect(() => {
    if (!lv || over) return;
    iv.current = setInterval(() => setTime((t) => t - 1), 100);
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [lv, over]);

  useEffect(() => {
    if (lv && !over && time <= 0) miss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  function miss() {
    const left = lives - 1;
    setLives(left);
    if (left <= 0) {
      setOver(true);
      report(level - 1);
      submitScore("odd", level - 1);
    } else start(level);
  }

  function click(i: number) {
    if (!lv || over) return;
    if (i === lv.at) {
      report(level);
      const nl = level + 1;
      setLevel(nl);
      start(nl);
    } else miss();
  }

  function newGame() {
    setLevel(1);
    setLives(MAX_LIVES);
    setOver(false);
    start(1);
  }

  const cw = lv ? (lv.base.length > 1 ? 34 : 28) : 28;

  return (
    <Shell path="/games/odd" title="odd one out" help="one character is different. find it before the timer ends. glyphs get sneakier every 3 levels.">
      <Stats items={[["level", level], ["lives", lifeBar(lives, MAX_LIVES)], ["time", (Math.max(0, time) / 10).toFixed(1) + "s"], ["best", best]]} />
      {!lv ? (
        <button className="btn mt-4" onClick={newGame}>start</button>
      ) : over ? (
        <Banner title="game over" lines={[`the odd one was "${lv.odd}" among "${lv.base}"`, `score: ${level - 1}`]} action="play again" onAction={newGame} />
      ) : (
        <div className="mt-4 inline-grid" style={{ gridTemplateColumns: `repeat(${lv.n}, ${cw}px)` }}>
          {Array.from({ length: lv.n * lv.n }).map((_, i) => (
            <button
              key={`${level}-${i}`}
              onClick={() => click(i)}
              className="hover:underline"
              style={{ width: cw, height: 28, background: "transparent", color: "var(--fg)", border: 0, font: "inherit", fontSize: 17, cursor: "pointer" }}
            >
              {i === lv.at ? lv.odd : lv.base}
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}
